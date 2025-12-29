import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { RenderResult } from '@/domain/value-objects/RenderResult';
import { ShaderEffect } from '@/types/shader';
import { ShaderInputVars } from '@/types/shader';

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
   * @param image - The source image to render
   * @param effect - The shader effect to apply
   * @param params - Parameter values for the shader
   * @returns The rendered result
   */
  renderScene(
    image: Image,
    effect: ShaderEffect,
    params: ShaderInputVars
  ): RenderResult;

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
