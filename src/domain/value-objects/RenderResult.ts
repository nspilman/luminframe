import { Dimensions } from './Dimensions';

/**
 * Result of a rendering operation.
 * Contains the rendered image data and metadata about the render.
 * Immutable value object.
 */
export class RenderResult {
  constructor(
    public readonly imageData: ImageData,
    public readonly dimensions: Dimensions,
    public readonly timestamp: Date = new Date()
  ) {
    if (!imageData) {
      throw new Error('ImageData is required');
    }
    if (!dimensions) {
      throw new Error('Dimensions are required');
    }
    if (imageData.width !== dimensions.width || imageData.height !== dimensions.height) {
      throw new Error(
        `ImageData dimensions (${imageData.width}x${imageData.height}) ` +
        `do not match Dimensions (${dimensions.width}x${dimensions.height})`
      );
    }
  }

  /**
   * Get the aspect ratio of the rendered result
   */
  getAspectRatio(): number {
    return this.dimensions.getAspectRatio();
  }

  /**
   * Get the total number of pixels
   */
  getPixelCount(): number {
    return this.dimensions.width * this.dimensions.height;
  }

  /**
   * Get the size in bytes (approximate)
   */
  getSizeInBytes(): number {
    // ImageData uses 4 bytes per pixel (RGBA)
    return this.getPixelCount() * 4;
  }

  /**
   * Check if dimensions match a target
   */
  matchesDimensions(target: Dimensions): boolean {
    return this.dimensions.equals(target);
  }

  /**
   * Create RenderResult from canvas
   */
  static fromCanvas(canvas: HTMLCanvasElement): RenderResult {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dimensions = new Dimensions(canvas.width, canvas.height);

    return new RenderResult(imageData, dimensions);
  }

  /**
   * Create RenderResult with specified dimensions
   */
  static create(imageData: ImageData): RenderResult {
    const dimensions = new Dimensions(imageData.width, imageData.height);
    return new RenderResult(imageData, dimensions);
  }

  /**
   * String representation
   */
  toString(): string {
    return `RenderResult(${this.dimensions.toString()}, ${this.getSizeInBytes()} bytes)`;
  }
}
