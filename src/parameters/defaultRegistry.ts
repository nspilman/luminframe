import { ParameterRegistry } from './ParameterRegistry';
import {
  RangeRenderer,
  ImageRenderer,
  ColorRenderer,
  BooleanRenderer,
  Vec2Renderer,
} from './renderers';
import {
  NumberConverter,
  BooleanConverter,
  ColorConverter,
  ImageConverter,
  ArrayConverter,
} from './converters';

/**
 * Builds a ParameterRegistry with all built-in renderers and converters.
 *
 * Single source of truth for the default wiring, shared by the React provider
 * and by tests. Converter order is significant — more specific converters are
 * registered first (see ParameterRegistry.convertToUniform).
 */
export function createDefaultParameterRegistry(): ParameterRegistry {
  const registry = new ParameterRegistry();

  registry.registerRenderer('range', new RangeRenderer());
  registry.registerRenderer('image', new ImageRenderer());
  registry.registerRenderer('color', new ColorRenderer());
  registry.registerRenderer('boolean', new BooleanRenderer());
  registry.registerRenderer('vec2', new Vec2Renderer());

  registry.registerConverter(new ImageConverter());
  registry.registerConverter(new ColorConverter());
  registry.registerConverter(new BooleanConverter());
  registry.registerConverter(new ArrayConverter());
  registry.registerConverter(new NumberConverter());

  return registry;
}
