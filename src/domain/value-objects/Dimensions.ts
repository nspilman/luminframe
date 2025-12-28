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
   * Calculate the aspect ratio (width / height)
   */
  getAspectRatio(): number {
    return this.width / this.height;
  }

  /**
   * Scale dimensions by a factor
   */
  scale(factor: number): Dimensions {
    if (factor <= 0) {
      throw new Error('Scale factor must be positive');
    }
    return new Dimensions(
      Math.round(this.width * factor),
      Math.round(this.height * factor)
    );
  }

  /**
   * Check equality with another Dimensions object
   */
  equals(other: Dimensions): boolean {
    return this.width === other.width && this.height === other.height;
  }

  /**
   * Convert to tuple [width, height]
   */
  toArray(): [number, number] {
    return [this.width, this.height];
  }

  /**
   * Create Dimensions from a tuple
   */
  static fromArray([width, height]: [number, number]): Dimensions {
    return new Dimensions(width, height);
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.width}x${this.height}`;
  }
}
