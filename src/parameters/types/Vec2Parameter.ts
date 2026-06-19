import { ParameterDefinition } from '../types';

/**
 * Parameter definition for 2D vector inputs. Vec2Renderer casts the generic
 * ParameterDefinition to this to read its per-axis min/max/step and labels.
 */
export interface Vec2ParameterDefinition
  extends ParameterDefinition<[number, number]> {
  type: 'vec2';
  min?: [number, number];
  max?: [number, number];
  step?: [number, number];
  labels?: [string, string]; // Labels for x and y components
}
