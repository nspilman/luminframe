import { UniformConverter, UniformValue } from '../types';
import { Color } from '@/domain/value-objects/Color';

/**
 * Converts Color value objects to shader uniforms (vec3)
 */
export class ColorConverter implements UniformConverter<Color> {
  canConvert(value: any): boolean {
    return value instanceof Color;
  }

  toUniform(value: Color): UniformValue {
    const arr = value.toFloat32Array();
    return [arr[0], arr[1], arr[2]];
  }
}
