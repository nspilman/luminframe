import { Dimensions } from '../value-objects/Dimensions';

/**
 * Image data containing the source URL and optional blob
 */
export interface ImageData {
  readonly url: string;
  readonly blob?: Blob;
}

/**
 * Domain model for an image with dimensions and data.
 * Abstracts away rendering library specifics (Three.js Texture, etc.)
 */
export class Image {
  constructor(
    public readonly id: string,
    public readonly dimensions: Dimensions,
    public readonly data: ImageData
  ) {
    if (!id) {
      throw new Error('Image ID is required');
    }
    if (!data.url) {
      throw new Error('Image URL is required');
    }
  }

  /**
   * Get the aspect ratio of the image
   */
  getAspectRatio(): number {
    return this.dimensions.getAspectRatio();
  }

  /**
   * Get the dimensions of the image
   */
  getDimensions(): Dimensions {
    return this.dimensions;
  }

  /**
   * Load image from a File object
   */
  static async fromFile(file: File): Promise<Image> {
    if (!file.type.startsWith('image/')) {
      throw new Error(`File must be an image, got ${file.type}`);
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const dimensions = new Dimensions(img.width, img.height);
          const image = new Image(
            crypto.randomUUID(),
            dimensions,
            { url, blob: file }
          );
          resolve(image);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Load image from a URL
   */
  static async fromUrl(url: string): Promise<Image> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();

      img.onload = () => {
        try {
          const dimensions = new Dimensions(img.width, img.height);
          const image = new Image(
            crypto.randomUUID(),
            dimensions,
            { url }
          );
          resolve(image);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image from ${url}`));
      };

      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  /**
   * Dispose of the image and clean up resources
   */
  dispose(): void {
    // Only revoke blob URLs (ones we created)
    if (this.data.blob && this.data.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.data.url);
    }
  }

  /**
   * String representation
   */
  toString(): string {
    return `Image(${this.id}, ${this.dimensions.toString()})`;
  }
}
