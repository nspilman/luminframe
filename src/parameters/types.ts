import { ReactNode } from 'react';

/**
 * Uniform value types that can be passed to shaders
 */
export type UniformValue =
  | number
  | boolean
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | object; // For textures, images, etc.

/**
 * Definition of a shader parameter
 * Generic type T represents the parameter's value type
 */
export interface ParameterDefinition<T = any> {
  readonly type: string;
  readonly label: string;
  readonly defaultValue: T;
  validate?(value: T): boolean;
  serialize?(value: T): any;
  deserialize?(data: any): T;
}

/**
 * Renders UI controls for a parameter type
 * Implements the Strategy pattern for different parameter UIs
 */
export interface ParameterRenderer<T = any> {
  /**
   * Check if this renderer can handle the given parameter
   */
  canRender(param: ParameterDefinition): boolean;

  /**
   * Render the parameter control
   */
  render(
    param: ParameterDefinition<T>,
    value: T,
    onChange: (value: T) => void
  ): ReactNode;
}

/**
 * Converts parameter values to shader uniform values
 * Handles the translation between domain models and GPU types
 */
export interface UniformConverter<T = any> {
  /**
   * Check if this converter can handle the given value
   */
  canConvert(value: any): boolean;

  /**
   * Convert the value to a uniform value
   */
  toUniform(value: T): UniformValue;
}
