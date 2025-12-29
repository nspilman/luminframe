import { UniformConverter, UniformValue } from '../types';

/**
 * Converts number arrays to shader uniforms (vec2, vec3, vec4)
 */
export class ArrayConverter implements UniformConverter<number[]> {
  canConvert(value: any): boolean {
    return (
      Array.isArray(value) &&
      value.length >= 2 &&
      value.length <= 4 &&
      value.every((v) => typeof v === 'number')
    );
  }

  toUniform(value: number[]): UniformValue {
    if (value.length === 2) {
      return [value[0], value[1]];
    } else if (value.length === 3) {
      return [value[0], value[1], value[2]];
    } else if (value.length === 4) {
      return [value[0], value[1], value[2], value[3]];
    }

    // Fallback
    return value as UniformValue;
  }
}
