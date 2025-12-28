import { Texture, TextureLoader } from 'three';
import { Image } from '@/domain/models/Image';

/**
 * Handle for a Three.js texture that includes the source image
 */
export interface TextureHandle {
  readonly id: string;
  readonly texture: Texture;
  readonly source: Image;
}

/**
 * Adapter for creating and managing Three.js textures from domain Image models.
 * Abstracts Three.js details from the rest of the application.
 */
export class TextureAdapter {
  private textureLoader = new TextureLoader();
  private textureCache = new Map<string, TextureHandle>();

  /**
   * Create a Three.js texture from a domain Image
   * Uses caching to avoid recreating textures for the same image
   */
  createTexture(image: Image): TextureHandle {
    // Check cache first
    const cached = this.textureCache.get(image.id);
    if (cached) {
      return cached;
    }

    // Create new texture
    const texture = this.textureLoader.load(image.data.url);

    const handle: TextureHandle = {
      id: image.id,
      texture,
      source: image
    };

    this.textureCache.set(image.id, handle);
    return handle;
  }

  /**
   * Get a texture from cache by image ID
   */
  getTexture(imageId: string): TextureHandle | undefined {
    return this.textureCache.get(imageId);
  }

  /**
   * Check if a texture exists in cache
   */
  hasTexture(imageId: string): boolean {
    return this.textureCache.has(imageId);
  }

  /**
   * Dispose of a texture and remove from cache
   */
  disposeTexture(id: string): void {
    const handle = this.textureCache.get(id);
    if (handle) {
      handle.texture.dispose();
      handle.source.dispose();
      this.textureCache.delete(id);
    }
  }

  /**
   * Clear all textures from cache and dispose of them
   */
  clearCache(): void {
    this.textureCache.forEach(handle => {
      handle.texture.dispose();
      handle.source.dispose();
    });
    this.textureCache.clear();
  }

  /**
   * Get the number of cached textures
   */
  get cacheSize(): number {
    return this.textureCache.size;
  }
}
