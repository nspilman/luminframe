import { Image } from '@/domain/models/Image';

/**
 * Handle for a texture that abstracts rendering engine details
 */
export interface TextureHandle {
  readonly id: string;
  readonly source: Image;
  // The actual texture implementation is opaque to the application layer
  readonly handle: unknown;
}

/**
 * Port for texture management.
 * Abstracts away texture creation and lifecycle management.
 *
 * This is an OUTPUT port - the application uses this to manage textures.
 */
export interface TexturePort {
  /**
   * Create a texture from a domain Image
   *
   * @param image - The image to create a texture from
   * @returns A texture handle
   */
  createTexture(image: Image): TextureHandle;

  /**
   * Get a cached texture by image ID
   *
   * @param imageId - The ID of the image
   * @returns The texture handle if cached, undefined otherwise
   */
  getTexture(imageId: string): TextureHandle | undefined;

  /**
   * Check if a texture is cached
   *
   * @param imageId - The ID of the image
   * @returns true if cached, false otherwise
   */
  hasTexture(imageId: string): boolean;

  /**
   * Dispose of a texture and free resources
   *
   * @param id - The texture ID to dispose
   */
  disposeTexture(id: string): void;

  /**
   * Clear all cached textures
   */
  clearCache(): void;

  /**
   * Get the number of cached textures
   *
   * @returns The cache size
   */
  getCacheSize(): number;
}
