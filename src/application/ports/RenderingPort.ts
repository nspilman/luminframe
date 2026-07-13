import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { ShaderEffect } from '@/types/shader';
import { ShaderInputVars } from '@/types/shader';

/**
 * One effect in a render chain: the resolved shader and the parameter values to
 * render it with. The pass's input texture is not named here — it is the chain
 * position (the source for the first pass, the previous pass's output after).
 */
export interface RenderPass {
  readonly effect: ShaderEffect;
  readonly params: ShaderInputVars;
}

/**
 * Port for rendering operations.
 * Abstracts away rendering engine specifics (Three.js, WebGL, Canvas, etc.)
 *
 * This is an OUTPUT port - the application uses this to render scenes.
 */
export interface RenderingPort {
  /**
   * Render a chain of effects as a single GPU pipeline: the source flows through
   * each pass in order, each pass sampling the previous pass's output, and only
   * the final pass drawing to the canvas. Intermediate results stay on the GPU
   * (offscreen framebuffers) — no canvas readback, no async round-trip between
   * passes, so the whole chain is one synchronous, race-free render.
   *
   * @param source - The image the chain starts from
   * @param passes - The effects to fold over the source, in order
   * @param resolution - The [width, height] uniform fed to each pass
   */
  renderChain(
    source: Image,
    passes: ReadonlyArray<RenderPass>,
    resolution: [number, number]
  ): void;

  /**
   * Export the current edit to a blob at the source's native resolution.
   *
   * @param format - The image format (PNG, JPEG, WebP)
   * @returns A blob containing the exported image
   */
  exportCanvas(format: ImageFormat): Promise<Blob>;

  /**
   * Whether the current edit animates — it has a time- or feedback-driven effect,
   * so it redraws continuously and a single-frame export would freeze the motion.
   */
  isAnimated(): boolean;

  /**
   * Render a run of frames of the current animated edit at evenly stepped times,
   * each sized to fit `maxSize` on its longest side (aspect preserved). The frames
   * are captured in sequence so feedback effects accumulate correctly. Returns raw
   * RGBA frames for an encoder to turn into an animation.
   */
  captureAnimationFrames(opts: {
    frameCount: number;
    fps: number;
    maxSize: number;
  }): Promise<ImageData[]>;

  /**
   * Get the current canvas element for external operations
   *
   * @returns The canvas element or null if not available
   */
  getCanvas(): HTMLCanvasElement | null;

  /**
   * Update canvas dimensions
   *
   * @param dimensions - New canvas dimensions
   */
  updateDimensions(dimensions: Dimensions): void;

  /**
   * Clean up rendering resources
   */
  dispose(): void;
}
