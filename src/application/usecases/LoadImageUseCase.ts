import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { Image } from '@/domain/models/Image';

/**
 * Use case for loading images from various sources.
 *
 * This orchestrates the image loader adapter to:
 * 1. Load image from file or URL
 * 2. Validate image format
 * 3. Return domain Image object
 */
export class LoadImageUseCase {
  constructor(private readonly imageLoader: ImageLoaderPort) {}

  /**
   * Load an image from a File object
   */
  async loadFromFile(file: File): Promise<Image> {
    if (!this.imageLoader.isValidImageFile(file)) {
      const supported = this.imageLoader.getSupportedTypes();
      throw new Error(
        `Invalid image file type: ${file.type}. Supported types: ${supported.join(', ')}`
      );
    }

    return await this.imageLoader.loadFromFile(file);
  }

  /**
   * Load an image from a URL
   */
  async loadFromUrl(url: string): Promise<Image> {
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    return await this.imageLoader.loadFromUrl(url);
  }

  /**
   * Get list of supported image types
   */
  getSupportedTypes(): string[] {
    return this.imageLoader.getSupportedTypes();
  }
}
