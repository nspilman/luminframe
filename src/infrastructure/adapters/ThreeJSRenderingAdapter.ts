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
    const { source, passes, resolution } = params;

    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }
    if (passes.length === 0) {
      return;
    }

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
  }

  /** Seconds since the animation loop started; 0 while it is stopped. */
  private elapsedSeconds(): number {
    return this.clockStartMs === null
      ? 0
      : (performance.now() - this.clockStartMs) / 1000;
  }

  /**
   * Start or stop the animation loop to match the current chain. A chain is
   * animated when any of its effect bodies reference the `time` uniform; static
   * chains leave the loop off so the GPU isn't redrawing an unchanging frame.
   */
  private syncAnimation(): void {
    const animated =
      !!this.lastChainParams &&
      this.lastChainParams.passes.some((p) => /\btime\b/.test(p.effect.getBody()));

    if (animated) {
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
   * Export the current canvas to a blob
   */
  async exportCanvas(
    dimensions: Dimensions,
    format: ImageFormat
  ): Promise<Blob> {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    const canvas = this.renderer.domElement;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
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
    this.lastChainParams = null;

    // Clear texture cache
    this.textureAdapter.clearCache();

    // Reset camera
    this.camera = null;
  }
}
