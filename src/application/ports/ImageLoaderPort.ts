import { Image } from '@/domain/models/Image';

/**
 * Port for loading images from various sources.
 * Abstracts away file system and network I/O specifics.
 *
 * This is an INPUT port - the application needs this to load images.
 */
export interface ImageLoaderPort {
  /**
   * Load an image from a File object (e.g., from file input)
   *
   * @param file - The file to load
   * @returns Promise resolving to a domain Image object
   * @throws Error if file is not a valid image or loading fails
   */
  loadFromFile(file: File): Promise<Image>;

  /**
   * Load an image from a URL
   *
   * @param url - The URL to load the image from
   * @returns Promise resolving to a domain Image object
   * @throws Error if URL is invalid or loading fails
   */
  loadFromUrl(url: string): Promise<Image>;

  /**
   * Validate that a file is a valid image
   *
   * @param file - The file to validate
   * @returns true if valid, false otherwise
   */
  isValidImageFile(file: File): boolean;

  /**
   * Get supported image MIME types
   *
   * @returns Array of supported MIME types
   */
  getSupportedTypes(): string[];
}
