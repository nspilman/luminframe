import { ParameterDefinition } from '../types';

/**
 * Parameter definition for 2D vector inputs
 */
export interface Vec2ParameterDefinition
  extends ParameterDefinition<[number, number]> {
  type: 'vec2';
  min?: [number, number];
  max?: [number, number];
  step?: [number, number];
  labels?: [string, string]; // Labels for x and y components
}

/**
 * Create a vec2 parameter definition
 */
export function createVec2Parameter(
  label: string,
  defaultValue: [number, number],
  options?: {
    min?: [number, number];
    max?: [number, number];
    step?: [number, number];
    labels?: [string, string];
  }
): Vec2ParameterDefinition {
  return {
    type: 'vec2',
    label,
    defaultValue,
    min: options?.min,
    max: options?.max,
    step: options?.step,
    labels: options?.labels ?? ['X', 'Y'],
    validate: (value) =>
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number',
    serialize: (value) => value,
    deserialize: (data) =>
      Array.isArray(data) ? [Number(data[0]), Number(data[1])] : [0, 0],
  };
}
