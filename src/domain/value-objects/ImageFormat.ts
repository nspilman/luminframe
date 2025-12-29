/**
 * Image format value object representing supported export formats.
 * Immutable and type-safe.
 */
export class ImageFormat {
  private constructor(
    private readonly mimeType: string,
    private readonly extension: string,
    private readonly quality?: number
  ) {}

  /**
   * PNG format - lossless compression, supports transparency
   */
  static readonly PNG = new ImageFormat('image/png', 'png');

  /**
   * JPEG format - lossy compression, smaller file sizes
   */
  static readonly JPEG = new ImageFormat('image/jpeg', 'jpg', 0.95);

  /**
   * WebP format - modern format with better compression
   */
  static readonly WEBP = new ImageFormat('image/webp', 'webp', 0.95);

  /**
   * Get the MIME type for this format
   */
  getMimeType(): string {
    return this.mimeType;
  }

  /**
   * Get the file extension for this format
   */
  getExtension(): string {
    return this.extension;
  }

  /**
   * Get the default quality setting (0-1) for lossy formats
   * Returns undefined for lossless formats
   */
  getQuality(): number | undefined {
    return this.quality;
  }

  /**
   * Check if this format supports transparency
   */
  supportsTransparency(): boolean {
    return this.mimeType === 'image/png' || this.mimeType === 'image/webp';
  }

  /**
   * Check if this format uses lossy compression
   */
  isLossy(): boolean {
    return this.mimeType === 'image/jpeg';
  }

  /**
   * Create ImageFormat from MIME type string
   */
  static fromMimeType(mimeType: string): ImageFormat {
    switch (mimeType) {
      case 'image/png':
        return ImageFormat.PNG;
      case 'image/jpeg':
      case 'image/jpg':
        return ImageFormat.JPEG;
      case 'image/webp':
        return ImageFormat.WEBP;
      default:
        throw new Error(`Unsupported image format: ${mimeType}`);
    }
  }

  /**
   * Create ImageFormat from file extension
   */
  static fromExtension(extension: string): ImageFormat {
    const normalized = extension.toLowerCase().replace(/^\./, '');
    switch (normalized) {
      case 'png':
        return ImageFormat.PNG;
      case 'jpg':
      case 'jpeg':
        return ImageFormat.JPEG;
      case 'webp':
        return ImageFormat.WEBP;
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): ImageFormat[] {
    return [ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP];
  }

  /**
   * Check equality with another ImageFormat
   */
  equals(other: ImageFormat): boolean {
    return this.mimeType === other.mimeType;
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.extension.toUpperCase()} (${this.mimeType})`;
  }
}
