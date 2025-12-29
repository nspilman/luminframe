import { ParameterDefinition } from '../types';

/**
 * Parameter definition for boolean inputs (toggles/checkboxes)
 */
export interface BooleanParameterDefinition
  extends ParameterDefinition<boolean> {
  type: 'boolean';
}

/**
 * Create a boolean parameter definition
 */
export function createBooleanParameter(
  label: string,
  defaultValue: boolean
): BooleanParameterDefinition {
  return {
    type: 'boolean',
    label,
    defaultValue,
    validate: (value) => typeof value === 'boolean',
    serialize: (value) => value,
    deserialize: (data) => Boolean(data),
  };
}
