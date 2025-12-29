import { UniformConverter, UniformValue } from '../types';
import { Image } from '@/domain/models/Image';

/**
 * Converts Image domain models to shader uniforms
 * Note: The actual conversion to Three.js Texture happens in ImageScene
 * This converter just passes through the Image object
 */
export class ImageConverter implements UniformConverter<Image> {
  canConvert(value: any): boolean {
    return value instanceof Image;
  }

  toUniform(value: Image): UniformValue {
    // Return the Image object itself
    // The rendering layer (ImageScene) will convert it to a texture
    return value;
  }
}
