import * as THREE from 'three';
import { RenderingPort, RenderPass } from '@/application/ports/RenderingPort';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { ShaderEffect } from '@/types/shader';
import { ShaderInputVars } from '@/types/shader';
import { Color } from '@/domain/value-objects/Color';
import { TextureAdapter } from './TextureAdapter';
import { shaderBuilder } from '@/shaders/shaderBuilder';
import { planPasses } from './renderChainPlan';
import { scaleToLongestSide } from '@/lib/exportCanvasForUpload';
import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Draws the source unchanged. Used when the pipeline is empty (no effects applied
// and none being tuned) so "no edits yet" renders the *original* to the canvas —
// not a blank frame — which also means Download and Save capture the image. It is
// an internal render detail, deliberately not in the effect library or catalog.
const PASSTHROUGH_EFFECT: ShaderEffect = createShaderRecord({
  name: 'Original',
  variables: [createShaderVariable('imageTexture').asImage('Source Image')],
  body: 'void main() { gl_FragColor = texture2D(imageTexture, vUv); }',
});
const NO_PARAMS = {} as ShaderInputVars;

/**
 * Three.js implementation of the RenderingPort.
 * Handles WebGL rendering using Three.js library.
 *
 * This adapter isolates Three.js specifics from the application layer,
 * allowing the rendering engine to be swapped without affecting business logic.
 */
export class ThreeJSRenderingAdapter implements RenderingPort {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private mesh: THREE.Mesh | null = null;
  private textureAdapter: TextureAdapter;
  private currentDimensions: Dimensions;
  // The two offscreen framebuffers a multi-pass chain ping-pongs between.
  // Allocated lazily (single-pass renders never need them) and resized with the
  // canvas. null until the first multi-pass chain runs.
  private renderTargets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  // The last chain rendered, replayed when a streaming texture finishes loading
  // so the frame fills in once its pixels arrive.
  private lastChainParams: {
    source: Image;
    passes: ReadonlyArray<RenderPass>;
    resolution: [number, number];
  } | null = null;
  // The animation clock. When the current chain has a time-dependent effect, a
  // requestAnimationFrame loop re-draws it each frame with an advancing `time`
  // uniform; static chains draw once and the loop stays off, so the GPU idles.
  private animationFrameId: number | null = null;
  private clockStartMs: number | null = null;
  // Holds the previous frame's canvas output, exposed to effects as `prevFrame`
  // so they can feed back on themselves (trails, tunnels). Written after each
  // frame that uses feedback; read at the top of the next. null until first use.
  private feedbackTexture: THREE.FramebufferTexture | null = null;

  constructor(
    canvas?: HTMLCanvasElement,
    initialDimensions: Dimensions = new Dimensions(800, 600)
  ) {
    this.textureAdapter = new TextureAdapter();
    this.currentDimensions = initialDimensions;

    // Re-render the last chain once a streaming texture finishes loading. The
    // source (and any second input) upload asynchronously; the first draw with
    // an unloaded texture is blank, and this fills it in when the pixels land.
    this.textureAdapter.setOnTextureLoad(() => {
      if (this.lastChainParams) {
        const { source, passes, resolution } = this.lastChainParams;
        this.renderChain(source, passes, resolution);
      }
    });

    if (canvas) {
      this.initializeRenderer(canvas);
    }
  }

  /**
   * Initialize the Three.js renderer with a canvas element
   */
  private initializeRenderer(canvas: HTMLCanvasElement): void {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      preserveDrawingBuffer: true, // Required for canvas export
    });

    // Set size with updateStyle=false to prevent Three.js from overriding our CSS
    this.renderer.setSize(
      this.currentDimensions.width,
      this.currentDimensions.height,
      false // Don't update CSS styles - let Tailwind handle it
    );

    // Create scene
    this.scene = new THREE.Scene();

    // Create orthographic camera with 1:1 aspect (full-screen quad approach)
    // The canvas aspect ratio will handle the stretching
    this.camera = new THREE.OrthographicCamera(
      -1,  // left
      1,   // right
      1,   // top
      -1,  // bottom
      0.1,
      1000
    );
    this.camera.position.z = 1;
  }

  /**
   * Set the canvas element for rendering
   * @param canvas - The canvas to render to
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    // Already bound to this exact canvas — nothing to do.
    if (this.renderer && this.renderer.domElement === canvas) {
      return;
    }

    // Handed a *different* canvas than the one we hold. This adapter is a
    // singleton that outlives any single React mount, so a remount (HMR, a route
    // change) brings a fresh <canvas> while we keep the old renderer bound to the
    // now-detached one. Left alone, every render() draws to the orphaned canvas
    // and the visible canvas stays blank. Tear down and rebind to the live one.
    if (this.renderer) {
      this.dispose();
    }

    this.initializeRenderer(canvas);
  }

  /**
   * Replace the texture-load callback. The constructor wires this to re-render
   * the last frame once a streaming texture arrives; an offscreen renderer that
   * drives its passes manually overrides it to await texture readiness instead.
   */
  setTextureLoadCallback(callback: () => void): void {
    this.textureAdapter.setOnTextureLoad(callback);
  }

  /**
   * Convert domain types to Three.js uniforms
   */
  private convertToUniforms(inputVars: ShaderInputVars): Record<string, { value: any }> {
    const uniforms: Record<string, { value: any }> = {
      time: { value: this.elapsedSeconds() }, // advances while the animation loop runs
    };

    for (const [key, value] of Object.entries(inputVars)) {
      if (value instanceof Image) {
        // Convert Image domain model to Three.js Texture
        const handle = this.textureAdapter.createTexture(value);
        uniforms[key] = { value: handle.texture };
      } else if (value instanceof Color) {
        // Convert Color value object to Three.js Vector3
        const arr = value.toFloat32Array();
        uniforms[key] = { value: new THREE.Vector3(arr[0], arr[1], arr[2]) };
      } else if (Array.isArray(value)) {
        // Convert arrays to appropriate Three.js vector types
        if (value.length === 2) {
          uniforms[key] = { value: new THREE.Vector2(...value) };
        } else if (value.length === 3) {
          uniforms[key] = { value: new THREE.Vector3(...value) };
        } else if (value.length === 4) {
          uniforms[key] = { value: new THREE.Vector4(...value) };
        } else {
          uniforms[key] = { value };
        }
      } else if (value instanceof Float32Array && value.length === 3) {
        // Legacy Float32Array color support
        uniforms[key] = { value: new THREE.Vector3(value[0], value[1], value[2]) };
      } else if (
        typeof value === 'number' ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        uniforms[key] = { value };
      } else {
        // Pass through other objects as-is
        uniforms[key] = { value };
      }
    }

    return uniforms;
  }

  /**
   * Build vertex shader (standard for all effects)
   */
  private getVertexShader(): string {
    return `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  /**
   * Render a chain of effects as one synchronous GPU pipeline. The source flows
   * through each pass in order; intermediate results live in offscreen
   * framebuffers (never read back to the CPU), and only the final pass draws to
   * the canvas. See renderChainPlan for the ping-pong that wires inputs to
   * outputs.
   */
  renderChain(
    source: Image,
    passes: ReadonlyArray<RenderPass>,
    resolution: [number, number]
  ): void {
    // Remember the chain so a late-arriving texture (or the animation loop) can
    // replay it. See the texture-load callback wired in the constructor.
    this.lastChainParams = { source, passes, resolution };
    this.drawChain();
    this.syncAnimation();
  }

  /**
   * Draw the remembered chain once, at the current clock time. Splitting this
   * out of renderChain lets the animation loop redraw the same chain each frame
   * (advancing `time`) without re-running the start/stop bookkeeping.
   */
  private drawChain(): void {
    const params = this.lastChainParams;
    if (!params) {
      return;
    }
    const { source, resolution } = params;

    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    // An empty pipeline still shows the original: a single passthrough pass blits
    // the source to the canvas, so "no effects yet" renders the image rather than
    // leaving a blank frame.
    const passes =
      params.passes.length === 0
        ? [{ effect: PASSTHROUGH_EFFECT, params: NO_PARAMS }]
        : params.passes;

    const sourceTexture = this.textureAdapter.createTexture(source).texture;
    const plan = planPasses(passes.length);
    // Framebuffers are only needed when a pass feeds another; a lone pass goes
    // straight to the canvas, so we never allocate them for the common case.
    const targets =
      passes.length > 1
        ? this.ensureRenderTargets(
            this.currentDimensions.width,
            this.currentDimensions.height
          )
        : null;

    // Feedback: ensure last frame's texture exists *before* the draw so effects
    // that sample `prevFrame` bind to it (black on the very first frame).
    const usesFeedback = this.chainUsesFeedback(passes);
    if (usesFeedback) {
      this.ensureFeedbackTexture(
        this.currentDimensions.width,
        this.currentDimensions.height
      );
    }

    for (let i = 0; i < passes.length; i++) {
      const step = plan[i];
      const inputTexture =
        step.input === 'source' ? sourceTexture : targets![step.input].texture;

      const material = this.buildPassMaterial(
        passes[i].effect,
        passes[i].params,
        inputTexture,
        resolution
      );
      this.setMeshMaterial(material);

      this.renderer.setRenderTarget(
        step.output === 'canvas' ? null : targets![step.output]
      );
      this.renderer.render(this.scene, this.camera);
    }

    // Leave the renderer pointed at the canvas for any external draws.
    this.renderer.setRenderTarget(null);

    // Capture this frame's canvas so the next frame can read it as `prevFrame`.
    if (usesFeedback && this.feedbackTexture) {
      this.renderer.copyFramebufferToTexture(this.feedbackTexture);
    }
  }

  /** Seconds since the animation loop started; 0 while it is stopped. */
  private elapsedSeconds(): number {
    return this.clockStartMs === null
      ? 0
      : (performance.now() - this.clockStartMs) / 1000;
  }

  /** Whether an effect samples last frame's output (`prevFrame`). */
  private effectUsesFeedback(effect: ShaderEffect): boolean {
    return /\bprevFrame\b/.test(effect.getBody());
  }

  /** Whether any pass in the chain feeds back on the previous frame. */
  private chainUsesFeedback(passes: ReadonlyArray<RenderPass>): boolean {
    return passes.some((p) => this.effectUsesFeedback(p.effect));
  }

  /**
   * Start or stop the animation loop to match the current chain. The loop is
   * needed when an effect advances with `time` OR feeds back on the previous
   * frame (`prevFrame`) — both require continuous re-rendering. A purely static
   * chain leaves the loop off so the GPU isn't redrawing an unchanging frame.
   */
  private syncAnimation(): void {
    const needsLoop =
      !!this.lastChainParams &&
      this.lastChainParams.passes.some((p) => {
        const body = p.effect.getBody();
        return /\btime\b/.test(body) || /\bprevFrame\b/.test(body);
      });

    if (needsLoop) {
      if (this.animationFrameId === null) {
        this.clockStartMs = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tickAnimation);
      }
    } else {
      this.stopAnimation();
    }
  }

  private tickAnimation = (): void => {
    this.drawChain();
    this.animationFrameId = requestAnimationFrame(this.tickAnimation);
  };

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.clockStartMs = null;
    }
  }

  /**
   * Build the shader material for one pass. The pass's input texture is injected
   * directly as the `imageTexture` uniform — for the first pass that is the
   * source, for later passes the previous pass's framebuffer — overriding
   * whatever imageTexture the params carried.
   */
  private buildPassMaterial(
    effect: ShaderEffect,
    params: ShaderInputVars,
    inputTexture: THREE.Texture,
    resolution: [number, number]
  ): THREE.ShaderMaterial {
    // imageTexture and resolution are owned by the chain, not the params.
    const { imageTexture: _img, resolution: _res, ...rest } = params;
    const uniforms = this.convertToUniforms(rest);
    uniforms.imageTexture = { value: inputTexture };
    uniforms.resolution = { value: new THREE.Vector2(resolution[0], resolution[1]) };

    // A feedback effect reads last frame's output; bind it when present.
    if (this.feedbackTexture && this.effectUsesFeedback(effect)) {
      uniforms.prevFrame = { value: this.feedbackTexture };
    }

    const fragmentShader = shaderBuilder({
      vars: effect.declarationVars,
      getBody: effect.getBody,
    });

    return new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader,
      uniforms,
      transparent: true,
    });
  }

  /**
   * Mount `material` on the full-screen quad, creating the mesh on first use and
   * disposing the material it replaces on every use after.
   */
  private setMeshMaterial(material: THREE.ShaderMaterial): void {
    if (!this.mesh) {
      const geometry = new THREE.PlaneGeometry(2, 2); // Full-screen quad
      this.mesh = new THREE.Mesh(geometry, material);
      this.scene!.add(this.mesh);
      return;
    }

    const oldMaterial = this.mesh.material;
    if (Array.isArray(oldMaterial)) {
      oldMaterial.forEach((mat) => mat.dispose());
    } else if (oldMaterial instanceof THREE.Material) {
      oldMaterial.dispose();
    }
    this.mesh.material = material;
  }

  /**
   * Lazily create (and resize) the two ping-pong framebuffers. Reused across
   * renders; rebuilt only when the canvas size changes.
   */
  private ensureRenderTargets(
    width: number,
    height: number
  ): [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] {
    const existing = this.renderTargets;
    if (existing && existing[0].width === width && existing[0].height === height) {
      return existing;
    }

    existing?.forEach((rt) => rt.dispose());
    const make = () =>
      new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
      });
    this.renderTargets = [make(), make()];
    return this.renderTargets;
  }

  /**
   * Lazily create (and resize) the texture that holds the previous frame's
   * output for feedback effects. Reused across frames — its content *is* the
   * history — and rebuilt only when the canvas size changes.
   */
  private ensureFeedbackTexture(width: number, height: number): THREE.FramebufferTexture {
    const existing = this.feedbackTexture;
    if (existing && existing.image.width === width && existing.image.height === height) {
      return existing;
    }

    existing?.dispose();
    const tex = new THREE.FramebufferTexture(width, height);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.feedbackTexture = tex;
    return tex;
  }

  /**
   * Export the current edit to a blob at the *source's* native resolution.
   *
   * The on-screen buffer is sized for display (fit-to-window × devicePixelRatio),
   * which is smaller than a large source and larger than a small one — so
   * capturing it directly would down- or up-sample the output. Instead we re-run
   * the remembered chain into a source-sized buffer, encode that, then restore
   * the display buffer. The result matches the source's real pixels (capped at
   * the GPU's max texture size so an oversized photo can't fail the render).
   *
   * With no chain to replay (no image loaded) it falls back to the current canvas.
   */
  async exportCanvas(format: ImageFormat): Promise<Blob> {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    const canvas = this.renderer.domElement;
    const params = this.lastChainParams;
    if (!params) {
      return this.encodeCanvas(canvas, format);
    }

    const [nativeWidth, nativeHeight] = this.exportBufferSize(params.source);
    const displayDimensions = this.currentDimensions;
    const wasAnimating = this.animationFrameId !== null;

    // Freeze the animation loop so it can't redraw at display size between our
    // native render and the async encode.
    this.stopAnimation();
    try {
      this.currentDimensions = new Dimensions(nativeWidth, nativeHeight);
      this.renderer.setSize(nativeWidth, nativeHeight, false);
      this.drawChain();
      return await this.encodeCanvas(canvas, format);
    } finally {
      this.currentDimensions = displayDimensions;
      this.renderer.setSize(displayDimensions.width, displayDimensions.height, false);
      this.drawChain();
      if (wasAnimating) this.syncAnimation();
    }
  }

  /**
   * The source's native pixel dimensions, scaled down only if the longest side
   * exceeds the GPU's max texture size (so an oversized photo renders instead of
   * failing). Aspect ratio is preserved either way.
   */
  private exportBufferSize(source: Image): [number, number] {
    const dims = source.getDimensions();
    const max = this.renderer?.capabilities.maxTextureSize ?? 4096;
    const { width, height } = scaleToLongestSide(dims.width, dims.height, max);
    return [width, height];
  }

  private encodeCanvas(canvas: HTMLCanvasElement, format: ImageFormat): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob from canvas'))),
        format.getMimeType(),
        format.getQuality()
      );
    });
  }

  /**
   * Get the current canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(dimensions: Dimensions): void {
    this.currentDimensions = dimensions;

    if (this.renderer) {
      // Set size with updateStyle=false to prevent Three.js from overriding our CSS
      this.renderer.setSize(dimensions.width, dimensions.height, false);
    } else {
      console.warn('[ThreeJSRenderingAdapter] Renderer not initialized, cannot update size');
    }

    // Camera stays fixed at -1 to 1 in both directions (full-screen quad)
    // The canvas aspect ratio handles the stretching
    // No need to update camera frustum
  }

  /**
   * Clean up Three.js resources
   */
  dispose(): void {
    // Stop the animation loop before tearing down the renderer it draws into.
    this.stopAnimation();

    // Dispose mesh
    if (this.mesh) {
      this.mesh.geometry.dispose();

      // Dispose material(s)
      const material = this.mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else if (material instanceof THREE.Material) {
        material.dispose();
      }

      this.scene?.remove(this.mesh);
      this.mesh = null;
    }

    // Dispose scene
    this.scene = null;

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Dispose the ping-pong framebuffers
    if (this.renderTargets) {
      this.renderTargets.forEach((rt) => rt.dispose());
      this.renderTargets = null;
    }

    if (this.feedbackTexture) {
      this.feedbackTexture.dispose();
      this.feedbackTexture = null;
    }
    this.lastChainParams = null;

    // Clear texture cache
    this.textureAdapter.clearCache();

    // Reset camera
    this.camera = null;
  }
}
