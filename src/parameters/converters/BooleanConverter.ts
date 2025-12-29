import { UniformConverter, UniformValue } from '../types';

/**
 * Converts booleans to shader uniforms
 */
export class BooleanConverter implements UniformConverter<boolean> {
  canConvert(value: any): boolean {
    return typeof value === 'boolean';
  }

  toUniform(value: boolean): UniformValue {
    return value;
  }
}
