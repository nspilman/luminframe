import { UniformConverter, UniformValue } from '../types';

/**
 * Converts numbers to shader uniforms
 */
export class NumberConverter implements UniformConverter<number> {
  canConvert(value: any): boolean {
    return typeof value === 'number';
  }

  toUniform(value: number): UniformValue {
    return value;
  }
}
