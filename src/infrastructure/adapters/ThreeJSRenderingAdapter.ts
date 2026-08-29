import * as THREE from 'three';
import { RenderingPort, RenderPass } from '@/application/ports/RenderingPort';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { ShaderEffect } from '@/types/shader';
import { ShaderInputVars } from '@/types/shader';
import { chainIsAnimated } from '@/lib/shaders/animation';
import { Color } from '@/domain/value-objects/Color';
import { TextureAdapter } from './TextureAdapter';
import { renderTextCanvas } from '@/lib/text/textTexture';
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
  // Two sizes live in this adapter and they are not the same thing.
  // `currentDimensions` is the buffer being drawn into — it follows the on-screen
  // canvas, and export temporarily swaps it (see withRenderSize). `sourceSize`
  // below is the source image's pixel size, which is what passes read as the
  // `resolution` uniform. Confusing them is what makes an effect look right in
  // one surface and wrong in another.
  // The last chain rendered, replayed when a streaming texture finishes loading
  // so the frame fills in once its pixels arrive.
  private lastChainParams: {
    source: Image;
    passes: ReadonlyArray<RenderPass>;
    sourceSize: [number, number];
  } | null = null;
  // The animation clock. When the current chain has a time-dependent effect, a
  // requestAnimationFrame loop re-draws it each frame with an advancing `time`
  // uniform; static chains draw once and the loop stays off, so the GPU idles.
  private animationFrameId: number | null = null;
  private clockStartMs: number | null = null;
  // When set, the `time` uniform is pinned to this value instead of the wall
  // clock — used to render an animation frame-by-frame at deterministic times
  // during a capture, rather than at whatever moment the draw happens to run.
  private captureTime: number | null = null;
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
        const { source, passes, sourceSize } = this.lastChainParams;
        this.renderChain(source, passes, sourceSize);
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
    // Context loss is the one render failure that looks like nothing: the
    // canvas silently goes (and stays) black while the rest of the page works.
    // iOS Safari sheds WebGL contexts under memory pressure, so name the event
    // loudly — the debug log is often read precisely to find this.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // signal willingness to restore
      console.error('[gl] CONTEXT LOST — canvas will render black until restored');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.log('[gl] context restored — redrawing');
      this.drawChain();
    });

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      preserveDrawingBuffer: true, // Required for canvas export
    });
    console.log(
      `[gl] renderer initialized, maxTextureSize=${this.renderer.capabilities.maxTextureSize}, buffer ${this.currentDimensions.width}x${this.currentDimensions.height}`
    );

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
   * Rasterized text, keyed by the string itself. Cached because the texture is
   * the expensive part and the string is the only thing that changes it: moving,
   * scaling, recolouring or spinning the text are all shader-side, so dragging
   * any of those dials reuses one texture instead of redrawing a canvas per frame.
   *
   * Bounded, and that bound is not a formality. The preview redraws on every
   * input event, and typing manufactures a distinct string per keystroke — a
   * nineteen-character caption asks for nineteen textures, each a megapixel of
   * RGBA. Nearly all of them are the half-typed words on the way to the one the
   * user meant, so the oldest is the right one to drop. Eviction disposes: a
   * Map entry is cheap, the GPU allocation behind it is not.
   */
  private static readonly MAX_TEXT_TEXTURES = 8;
  private textTextures = new Map<string, THREE.CanvasTexture>();

  private textTexture(text: string): THREE.CanvasTexture {
    const cached = this.textTextures.get(text);
    if (cached) {
      // Re-insert so insertion order stays recency order — that is the only
      // thing making the eviction below pick the least recently used.
      this.textTextures.delete(text);
      this.textTextures.set(text, cached);
      return cached;
    }
    const texture = new THREE.CanvasTexture(renderTextCanvas(text));
    // Clamp so the shader's out-of-tile samples read empty rather than
    // repeating the caption across the picture, and linear so the glyph edges
    // stay smooth when the text is scaled up.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.textTextures.set(text, texture);

    while (this.textTextures.size > ThreeJSRenderingAdapter.MAX_TEXT_TEXTURES) {
      const oldest = this.textTextures.keys().next().value as string;
      this.textTextures.get(oldest)?.dispose();
      this.textTextures.delete(oldest);
    }

    return texture;
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
      } else if (typeof value === 'string') {
        // Typed text. A string is the one input value a shader cannot take, so
        // it is rasterized to a texture here — the single point every render
        // passes through, which is why the conversion lives at this door rather
        // than being repeated by the editor, the thumbnails and the exporter.
        // Text is the only string-valued input kind (see TextInputDefinition),
        // so a string arriving here can only be glyphs.
        uniforms[key] = { value: this.textTexture(value) };
      } else if (
        typeof value === 'number' ||
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
    sourceSize: [number, number]
  ): void {
    // Remember the chain so a late-arriving texture (or the animation loop) can
    // replay it. See the texture-load callback wired in the constructor.
    this.lastChainParams = { source, passes, sourceSize };
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
    const { source, sourceSize } = params;

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
        sourceSize
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

  /**
   * The value fed to the `time` uniform. During a capture it is the pinned frame
   * time; otherwise it's seconds since the animation loop started (0 while stopped).
   */
  private elapsedSeconds(): number {
    if (this.captureTime !== null) return this.captureTime;
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
   * Whether the current edit animates — a still export would freeze its motion.
   * The predicate itself lives in lib/shaders/animation, one truth consulted
   * here, by the loop below, and (via the exporters) the download and save.
   */
  isAnimated(): boolean {
    return !!this.lastChainParams && chainIsAnimated(this.lastChainParams.passes);
  }

  /**
   * Start or stop the animation loop to match the current chain. The loop is
   * needed when an effect advances with `time` OR feeds back on the previous
   * frame (`prevFrame`) — both require continuous re-rendering. A purely static
   * chain leaves the loop off so the GPU isn't redrawing an unchanging frame.
   */
  private syncAnimation(): void {
    const needsLoop = !!this.lastChainParams && chainIsAnimated(this.lastChainParams.passes);

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
    sourceSize: [number, number]
  ): THREE.ShaderMaterial {
    // imageTexture and resolution are owned by the chain, not the params.
    const { imageTexture: _img, resolution: _res, ...rest } = params;
    const uniforms = this.convertToUniforms(rest);
    uniforms.imageTexture = { value: inputTexture };
    uniforms.resolution = { value: new THREE.Vector2(sourceSize[0], sourceSize[1]) };

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
    return this.exportAtSourceSize((canvas) => this.encodeCanvas(canvas, format));
  }

  /**
   * Run `body` against the canvas while it holds the chain rendered at the
   * source's native size (see exportBufferSize), then restore the display
   * render. Both saving and downloading a still read the canvas through this —
   * the display buffer is never captured directly, so its size (a rendering
   * detail that can lag layout) can't leak into exported pixels.
   */
  async exportAtSourceSize<T>(body: (canvas: HTMLCanvasElement) => Promise<T>): Promise<T> {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    const canvas = this.renderer.domElement;
    const params = this.lastChainParams;
    if (!params) {
      return body(canvas);
    }

    const [nativeWidth, nativeHeight] = this.exportBufferSize(params.source);
    return this.withRenderSize(nativeWidth, nativeHeight, () => {
      this.drawChain();
      return body(canvas);
    });
  }

  /**
   * Render at a temporary buffer size, then restore the display buffer. The live
   * animation loop is frozen for the duration (so it can't redraw at display size
   * mid-operation) and resumed after; the display frame is redrawn on the way out.
   * Both exports lean on this — a still at native size, an animation at a capped
   * size — so the freeze/resize/restore ceremony lives in exactly one place.
   */
  private async withRenderSize<T>(
    width: number,
    height: number,
    body: () => T | Promise<T>
  ): Promise<T> {
    const displayDimensions = this.currentDimensions;
    const wasAnimating = this.animationFrameId !== null;
    this.stopAnimation();
    try {
      this.currentDimensions = new Dimensions(width, height);
      this.renderer!.setSize(width, height, false);
      return await body();
    } finally {
      this.currentDimensions = displayDimensions;
      this.renderer!.setSize(displayDimensions.width, displayDimensions.height, false);
      this.drawChain();
      if (wasAnimating) this.syncAnimation();
    }
  }

  /**
   * Render a run of frames of the current animated edit at evenly stepped times,
   * capturing each as raw RGBA. Mirrors exportCanvas's freeze/resize/restore, but
   * renders frameCount frames at deterministic times (captureTime) instead of one
   * at the wall clock — so an encoder can turn the motion into an animation.
   *
   * Frames render in sequence from a reset feedback texture, so feedback effects
   * (trails, tunnels) accumulate from a clean start rather than inheriting the live
   * view's state. Sized to the source aspect, capped on the longest side.
   */
  async captureAnimationFrames(opts: {
    frameCount: number;
    fps: number;
    maxSize: number;
  }): Promise<ImageData[]> {
    if (!this.renderer || !this.lastChainParams) return [];

    const dims = this.lastChainParams.source.getDimensions();
    const { width, height } = scaleToLongestSide(dims.width, dims.height, opts.maxSize);

    const reader = document.createElement('canvas');
    reader.width = width;
    reader.height = height;
    const ctx = reader.getContext('2d');
    if (!ctx) return [];

    const frames: ImageData[] = [];
    await this.withRenderSize(width, height, () => {
      // Start feedback effects from a clean (black) previous frame, so the capture
      // doesn't inherit the live view's accumulated trails.
      this.resetFeedback();
      try {
        for (let i = 0; i < opts.frameCount; i++) {
          this.captureTime = i / opts.fps;
          this.drawChain();
          ctx.drawImage(this.renderer!.domElement, 0, 0, width, height);
          frames.push(ctx.getImageData(0, 0, width, height));
        }
      } finally {
        // Unpin before withRenderSize redraws the restored display frame.
        this.captureTime = null;
      }
    });
    return frames;
  }

  /** Drop the feedback texture so the next draw starts from a clean (black) frame. */
  private resetFeedback(): void {
    if (this.feedbackTexture) {
      this.feedbackTexture.dispose();
      this.feedbackTexture = null;
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

    // The rasterized captions hold GPU textures of their own.
    this.textTextures.forEach((texture) => texture.dispose());
    this.textTextures.clear();

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

    this.resetFeedback();
    this.lastChainParams = null;

    // Clear texture cache
    this.textureAdapter.clearCache();

    // Reset camera
    this.camera = null;
  }
}
