import { ParameterDefinition } from '../types';

/**
 * Parameter definition for numeric range inputs (sliders)
 */
export interface RangeParameterDefinition extends ParameterDefinition<number> {
  type: 'range';
  min: number;
  max: number;
  step: number;
}

/**
 * Create a range parameter definition
 */
export function createRangeParameter(
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number
): RangeParameterDefinition {
  return {
    type: 'range',
    label,
    defaultValue,
    min,
    max,
    step,
    validate: (value) => value >= min && value <= max,
    serialize: (value) => value,
    deserialize: (data) => Number(data),
  };
}
