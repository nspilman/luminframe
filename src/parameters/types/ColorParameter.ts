import { ParameterDefinition } from '../types';
import { Color } from '@/domain/value-objects/Color';

/**
 * Parameter definition for color inputs
 */
export interface ColorParameterDefinition extends ParameterDefinition<Color> {
  type: 'color';
}

/**
 * Create a color parameter definition
 */
export function createColorParameter(
  label: string,
  defaultValue: Color
): ColorParameterDefinition {
  return {
    type: 'color',
    label,
    defaultValue,
    validate: (value) => value instanceof Color,
    serialize: (value) => value.toHex(),
    deserialize: (data) => Color.fromHex(data),
  };
}
