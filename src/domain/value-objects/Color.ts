/**
 * Color value object representing RGB color.
 * Values are stored as floats between 0 and 1.
 * Immutable and validated.
 */
export class Color {
  private constructor(
    public readonly r: number,
    public readonly g: number,
    public readonly b: number
  ) {
    this.validateChannel(r, 'red');
    this.validateChannel(g, 'green');
    this.validateChannel(b, 'blue');
  }

  private validateChannel(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} channel must be a finite number`);
    }
    if (value < 0 || value > 1) {
      throw new Error(`${name} channel must be between 0 and 1, got ${value}`);
    }
  }

  /**
   * Convert color to Float32Array (for Three.js/WebGL)
   */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.r, this.g, this.b]);
  }

  /**
   * Convert color to hex string
   */
  toHex(): string {
    const toHex = (n: number) =>
      Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  /**
   * Convert color to RGB object with 0-1 values
   */
  toRGBObject(): { r: number; g: number; b: number } {
    return { r: this.r, g: this.g, b: this.b };
  }

  /**
   * Convert color to RGB object with 0-255 values
   */
  toRGB255(): { r: number; g: number; b: number } {
    return {
      r: Math.round(this.r * 255),
      g: Math.round(this.g * 255),
      b: Math.round(this.b * 255)
    };
  }

  /**
   * Check equality with another Color
   */
  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b;
  }

  /**
   * Create Color from RGB values (0-1)
   */
  static fromRGB(r: number, g: number, b: number): Color {
    return new Color(r, g, b);
  }

  /**
   * Create Color from hex string
   */
  static fromHex(hex: string): Color {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');

    if (cleanHex.length !== 6) {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    return new Color(r, g, b);
  }

  /**
   * Create Color from Float32Array
   */
  static fromFloat32Array(arr: Float32Array | number[]): Color {
    if (arr.length < 3) {
      throw new Error('Array must have at least 3 elements');
    }
    return new Color(arr[0], arr[1], arr[2]);
  }

  /**
   * Create Color from RGB255 values (0-255)
   */
  static fromRGB255(r: number, g: number, b: number): Color {
    return new Color(r / 255, g / 255, b / 255);
  }

  /**
   * Common color constants
   */
  static readonly BLACK = new Color(0, 0, 0);
  static readonly WHITE = new Color(1, 1, 1);
  static readonly RED = new Color(1, 0, 0);
  static readonly GREEN = new Color(0, 1, 0);
  static readonly BLUE = new Color(0, 0, 1);

  /**
   * String representation
   */
  toString(): string {
    return this.toHex();
  }
}
