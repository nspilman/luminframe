import { ParameterRegistry } from './ParameterRegistry';
import {
  RangeRenderer,
  ImageRenderer,
  ColorRenderer,
  BooleanRenderer,
  Vec2Renderer,
} from './renderers';

/**
 * Builds a ParameterRegistry with all built-in renderers.
 *
 * Single source of truth for the default wiring, shared by the React provider
 * and by tests.
 */
export function createDefaultParameterRegistry(): ParameterRegistry {
  const registry = new ParameterRegistry();

  registry.registerRenderer('range', new RangeRenderer());
  registry.registerRenderer('image', new ImageRenderer());
  registry.registerRenderer('color', new ColorRenderer());
  registry.registerRenderer('boolean', new BooleanRenderer());
  registry.registerRenderer('vec2', new Vec2Renderer());

  return registry;
}
