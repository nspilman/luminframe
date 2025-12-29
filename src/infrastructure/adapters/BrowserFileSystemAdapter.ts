import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';

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
   * Load an image from a URL
   */
  async loadFromUrl(url: string): Promise<Image> {
    // Validate URL
    try {
      new URL(url); // Will throw if invalid
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Use domain model's factory method
    return await Image.fromUrl(url);
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
   * Convert ImageData to a Blob
   */
  async toBlob(imageData: ImageData, format: ImageFormat): Promise<Blob> {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to create ${format.toString()} blob from ImageData`));
          }
        },
        format.getMimeType(),
        format.getQuality()
      );
    });
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

  /**
   * Convert a Blob to a data URL
   */
  async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };

      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if the browser supports a specific image format
   */
  supportsFormat(format: ImageFormat): boolean {
    // Create a temporary canvas to test format support
    const canvas = document.createElement('canvas');
    const supported = canvas.toDataURL(format.getMimeType()).startsWith('data:' + format.getMimeType());

    return supported;
  }

  /**
   * Get the best supported format from a list of preferences
   */
  getBestSupportedFormat(preferences: ImageFormat[]): ImageFormat {
    for (const format of preferences) {
      if (this.supportsFormat(format)) {
        return format;
      }
    }

    // Fallback to PNG (universally supported)
    return ImageFormat.PNG;
  }
}
