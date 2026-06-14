import { ParameterRegistry } from './ParameterRegistry';
import { createDefaultParameterRegistry } from './defaultRegistry';
import {
  RangeRenderer,
  ImageRenderer,
  ColorRenderer,
  BooleanRenderer,
  Vec2Renderer,
} from './renderers';
import { ParameterDefinition, ParameterRenderer, UniformConverter } from './types';
import { Color } from '@/domain/value-objects/Color';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';

const def = (type: string): ParameterDefinition => ({
  type,
  label: type,
  defaultValue: null,
});

const fakeRenderer = (canRender: boolean): ParameterRenderer => ({
  canRender: () => canRender,
  render: () => null,
});

const fakeConverter = (
  canConvert: boolean,
  output: unknown
): UniformConverter => ({
  canConvert: () => canConvert,
  toUniform: () => output as any,
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

  describe('convertToUniform', () => {
    it('uses the first converter whose canConvert matches', () => {
      const registry = new ParameterRegistry();
      registry.registerConverter(fakeConverter(false, 'skipped'));
      registry.registerConverter(fakeConverter(true, 'first-match'));
      registry.registerConverter(fakeConverter(true, 'second-match'));

      expect(registry.convertToUniform('anything')).toBe('first-match');
    });

    it('returns the value unchanged when no converter matches', () => {
      const registry = new ParameterRegistry();
      registry.registerConverter(fakeConverter(false, 'unused'));

      expect(registry.convertToUniform(42)).toBe(42);
    });
  });
});

// ---------------------------------------------------------------------------
// Production wiring, built from the real factory. These guard the planned
// parameter-taxonomy unification: each shader input type must keep resolving to
// the same control, and each value must keep converting to the same uniform.
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

  describe('uniform conversion', () => {
    it('converts a Color to an [r,g,b] tuple', () => {
      expect(registry.convertToUniform(Color.fromRGB(1, 0, 0.5))).toEqual([1, 0, 0.5]);
    });

    it('converts a 2-number array to a vec2 tuple', () => {
      expect(registry.convertToUniform([0.25, 0.75])).toEqual([0.25, 0.75]);
    });

    it('passes a number through unchanged', () => {
      expect(registry.convertToUniform(0.5)).toBe(0.5);
    });

    it('passes a boolean through unchanged', () => {
      expect(registry.convertToUniform(true)).toBe(true);
    });

    it('passes an Image through unchanged', () => {
      const image = new Image('id', new Dimensions(2, 2), { url: 'blob:test' });
      expect(registry.convertToUniform(image)).toBe(image);
    });

    it('leaves an oversized array unconverted', () => {
      // ArrayConverter only handles length 2-4; a 5-tuple falls through to passthrough.
      const oversized = [1, 2, 3, 4, 5];
      expect(registry.convertToUniform(oversized)).toBe(oversized);
    });
  });
});
