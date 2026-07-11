/**
 * Dimensions value object representing width and height.
 * Immutable and validated.
 */
export class Dimensions {
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    if (width <= 0 || height <= 0) {
      throw new Error('Dimensions must be positive');
    }
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error('Dimensions must be finite numbers');
    }
  }

  /**
   * Convert to tuple [width, height]
   */
  toArray(): [number, number] {
    return [this.width, this.height];
  }
}
