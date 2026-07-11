import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';

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

    // Use domain model's factory method
    // This is acceptable as Image.fromFile is a factory method
    return await Image.fromFile(file);
  }

  /**
   * Check if a file is a valid image
   */
  isValidImageFile(file: File): boolean {
    return BrowserFileSystemAdapter.SUPPORTED_TYPES.includes(file.type);
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
