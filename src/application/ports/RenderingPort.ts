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
   * Render a scene with the given shader effect and parameters
   *
   * Renders to the canvas. Consumers that need pixels read the canvas
   * separately via getCanvas()/exportCanvas().
   *
   * @param image - The source image to render
   * @param effect - The shader effect to apply
   * @param params - Parameter values for the shader
   */
  renderScene(
    image: Image,
    effect: ShaderEffect,
    params: ShaderInputVars
  ): void;

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
   * Export the current canvas to a specific image format
   *
   * @param dimensions - The dimensions to export
   * @param format - The image format (PNG, JPEG, WebP)
   * @returns A blob containing the exported image
   */
  exportCanvas(
    dimensions: Dimensions,
    format: ImageFormat
  ): Promise<Blob>;

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
