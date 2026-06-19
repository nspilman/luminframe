import { ReactNode } from 'react';
import { ShaderInputDefinition } from '@/types/shader';

/**
 * Renders the UI control for one shader input. The renderer consumes the input
 * descriptor directly (the discriminated ShaderInputDefinition), narrowing by
 * `param.type` to reach a range's min/max/step or a vec2's per-axis bounds — no
 * separate parameter vocabulary, no casts. The value type T is per-renderer
 * (number for range, Color for color, …); the registry keys renderers by input
 * type, so it holds them type-erased.
 */
export interface ParameterRenderer<T = unknown> {
  /** Whether this renderer handles the given input descriptor. */
  canRender(param: ShaderInputDefinition): boolean;

  /** Draw the control for `param`, seeded with `value`. */
  render(
    param: ShaderInputDefinition,
    value: T,
    onChange: (value: T) => void
  ): ReactNode;
}
