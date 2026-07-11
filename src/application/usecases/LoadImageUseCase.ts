import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { Image } from '@/domain/models/Image';

/**
 * Use case for loading an image from a file.
 *
 * Validates the file's type against the loader's supported set, then returns a
 * domain Image object.
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
}
