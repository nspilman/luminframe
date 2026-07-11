/**
 * Image format value object for export. Immutable; names the formats the
 * exporter can target and carries each one's MIME type and default quality.
 * Only PNG is wired today — JPEG/WEBP stand ready for a format-choice feature,
 * since the export path is already parameterized by an ImageFormat.
 */
export class ImageFormat {
  private constructor(
    private readonly mimeType: string,
    private readonly quality?: number
  ) {}

  /** PNG — lossless, supports transparency. */
  static readonly PNG = new ImageFormat('image/png');

  /** JPEG — lossy, smaller files. */
  static readonly JPEG = new ImageFormat('image/jpeg', 0.95);

  /** WebP — modern format with better compression. */
  static readonly WEBP = new ImageFormat('image/webp', 0.95);

  /** The MIME type for this format, e.g. `image/png`. */
  getMimeType(): string {
    return this.mimeType;
  }

  /** Default quality (0–1) for lossy formats; undefined for lossless. */
  getQuality(): number | undefined {
    return this.quality;
  }
}
