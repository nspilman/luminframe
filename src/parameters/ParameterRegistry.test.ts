import { ParameterRegistry } from './ParameterRegistry';
import { createDefaultParameterRegistry } from './defaultRegistry';
import {
  RangeRenderer,
  ImageRenderer,
  ColorRenderer,
  BooleanRenderer,
  Vec2Renderer,
} from './renderers';
import { ParameterRenderer } from './types';
import { ShaderInputDefinition } from '@/types/shader';

// A throwaway descriptor for exercising the registry's type-keyed dispatch. The
// registry only reads `.type`; the range fields keep 'range' valid and the cast
// lets us probe a synthetic, unregistered type too.
const def = (type: string): ShaderInputDefinition =>
  ({ type, label: type, min: 0, max: 1, step: 1 }) as unknown as ShaderInputDefinition;

const fakeRenderer = (canRender: boolean): ParameterRenderer => ({
  canRender: () => canRender,
  render: () => null,
});

// ---------------------------------------------------------------------------
// Registry dispatch logic, exercised with fakes so only the registry is under
// test. These pin the resolution rules every refactor of the wiring must honor.
// ---------------------------------------------------------------------------
describe('ParameterRegistry', () => {
  describe('getRenderer', () => {
    it('returns the renderer registered for an exact type', () => {
      const registry = new ParameterRegistry();
      const exact = fakeRenderer(false);
      registry.registerRenderer('range', exact);

      expect(registry.getRenderer(def('range'))).toBe(exact);
    });

    it('falls back to the first renderer whose canRender matches', () => {
      const registry = new ParameterRegistry();
      const matching = fakeRenderer(true);
      registry.registerRenderer('other', matching);

      // 'range' has no exact registration, so the fallback scan applies.
      expect(registry.getRenderer(def('range'))).toBe(matching);
    });

    it('returns undefined when no renderer matches', () => {
      const registry = new ParameterRegistry();
      registry.registerRenderer('other', fakeRenderer(false));

      expect(registry.getRenderer(def('range'))).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Production wiring, built from the real factory. These guard the planned
// parameter-taxonomy unification: each shader input type must keep resolving to
// the same control.
// ---------------------------------------------------------------------------
describe('production parameter wiring', () => {
  const registry = createDefaultParameterRegistry();

  describe('renderer resolution', () => {
    it('resolves range to a RangeRenderer', () => {
      expect(registry.getRenderer(def('range'))).toBeInstanceOf(RangeRenderer);
    });

    it('resolves image to an ImageRenderer', () => {
      expect(registry.getRenderer(def('image'))).toBeInstanceOf(ImageRenderer);
    });

    it('resolves color to a ColorRenderer', () => {
      // Effects declare vec3 uniforms with the 'color' UI input type.
      expect(registry.getRenderer(def('color'))).toBeInstanceOf(ColorRenderer);
    });

    it('resolves boolean to a BooleanRenderer', () => {
      expect(registry.getRenderer(def('boolean'))).toBeInstanceOf(BooleanRenderer);
    });

    it('resolves vec2 to a Vec2Renderer', () => {
      expect(registry.getRenderer(def('vec2'))).toBeInstanceOf(Vec2Renderer);
    });
  });
});
