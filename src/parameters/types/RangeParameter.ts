import { ParameterDefinition } from '../types';

/**
 * Parameter definition for numeric range inputs (sliders). RangeRenderer casts
 * the generic ParameterDefinition to this to read min/max/step when rendering a
 * 'range' input.
 */
export interface RangeParameterDefinition extends ParameterDefinition<number> {
  type: 'range';
  min: number;
  max: number;
  step: number;
}
