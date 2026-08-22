import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';

/**
 * Whether a file is HEIC/HEIF. Checked by MIME type and by extension: some
 * platforms hand over iPhone photos with an empty `type`, so the name is the
 * only signal there.
 */
export function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return file.type === '' && /\.(heic|heif)$/i.test(file.name);
}

/** Transcode a HEIC file to a JPEG one the browser's decoder can open. */
async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (err) {
    // heic2any rejects with a plain {code, message} object, which would reach
    // the user as "[object Object]" — rethrow as a sentence worth showing.
    console.error('HEIC decode failed:', err);
    throw new Error(`Couldn't read ${file.name} — this HEIC variant isn't supported. Exporting it as JPEG will work.`);
  }
}

/**
 * Browser-based implementation of ImageLoaderPort and ImageExportPort.
 * Uses browser File API, URL API, and Canvas API.
 *
 * This adapter isolates browser-specific file operations from the application layer.
 */
export class BrowserFileSystemAdapter implements ImageLoaderPort, ImageExportPort {
  private static readonly SUPPORTED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ];

  /**
   * Load an image from a File object
   */
  async loadFromFile(file: File): Promise<Image> {
    // Validate file type
    if (!this.isValidImageFile(file)) {
      throw new Error(
        `Invalid image file type: ${file.type}. Supported types: ${BrowserFileSystemAdapter.SUPPORTED_TYPES.join(', ')}`
      );
    }

    // HEIC (the iPhone camera default) can't be decoded by <img> outside
    // Safari, so it's transcoded to JPEG here — the one door every upload
    // walks through. The decoder is a wasm build of libheif, dynamically
    // imported so only the first HEIC upload pays for it.
    const toLoad = isHeicFile(file) ? await convertHeicToJpeg(file) : file;

    // Use domain model's factory method
    // This is acceptable as Image.fromFile is a factory method
    return await Image.fromFile(toLoad);
  }

  /**
   * Check if a file is a valid image
   */
  isValidImageFile(file: File): boolean {
    return BrowserFileSystemAdapter.SUPPORTED_TYPES.includes(file.type) || isHeicFile(file);
  }

  /**
   * Get list of supported image MIME types
   */
  getSupportedTypes(): string[] {
    return [...BrowserFileSystemAdapter.SUPPORTED_TYPES];
  }

  /**
   * Convert a canvas element to a domain Image object
   */
  async canvasToImage(canvas: HTMLCanvasElement): Promise<Image> {
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    // Create File from blob
    const file = new File([blob], 'canvas-export.png', { type: 'image/png' });

    // Load as Image domain object
    return await this.loadFromFile(file);
  }

  /**
   * Trigger a browser download of a blob
   */
  download(blob: Blob, filename: string): void {
    // Create object URL
    const url = URL.createObjectURL(blob);

    try {
      // Create temporary anchor element
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;

      // Trigger download
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup
      document.body.removeChild(anchor);
    } finally {
      // Revoke object URL after a delay to ensure download starts
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
  }

}
