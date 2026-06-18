import { EditPipeline } from './EditPipeline';
import { Image } from './Image';
import { Dimensions } from '../value-objects/Dimensions';
import { ShaderType } from '@/types/shader';

const makeImage = (id = 'img-1') =>
  new Image(id, new Dimensions(4, 2), { url: `blob:${id}` });

describe('EditPipeline', () => {
  describe('empty', () => {
    it('has no source', () => {
      expect(EditPipeline.empty().source).toBeNull();
    });

    it('has no effects', () => {
      const pipeline = EditPipeline.empty();
      expect(pipeline.isEmpty).toBe(true);
      expect(pipeline.length).toBe(0);
    });
  });

  describe('withSource', () => {
    it('anchors the edit to the given image', () => {
      const source = makeImage();
      expect(EditPipeline.empty().withSource(source).source).toBe(source);
    });

    it('does not mutate the original', () => {
      const original = EditPipeline.empty();
      original.withSource(makeImage());
      expect(original.source).toBeNull();
    });

    it('keeps the committed effects', () => {
      const pipeline = EditPipeline.empty().append('colorTint' as ShaderType, {});
      expect(pipeline.withSource(makeImage()).length).toBe(1);
    });
  });

  describe('append', () => {
    it('adds the effect at the end', () => {
      const pipeline = EditPipeline.empty()
        .append('colorTint' as ShaderType, { a: 1 })
        .append('vignette' as ShaderType, { b: 2 });

      expect(pipeline.effects.map((e) => e.type)).toEqual(['colorTint', 'vignette']);
    });

    it('carries the params it was committed with', () => {
      const pipeline = EditPipeline.empty().append('colorTint' as ShaderType, { a: 1 });
      expect(pipeline.effects[0].params).toEqual({ a: 1 });
    });

    it('does not mutate the original', () => {
      const original = EditPipeline.empty();
      original.append('colorTint' as ShaderType, {});
      expect(original.length).toBe(0);
    });
  });

  describe('removeAt', () => {
    const threeEffects = () =>
      EditPipeline.empty()
        .append('colorTint' as ShaderType, {})
        .append('vignette' as ShaderType, {})
        .append('wave' as ShaderType, {});

    it('drops the effect at the given index', () => {
      const result = threeEffects().removeAt(1);
      expect(result.effects.map((e) => e.type)).toEqual(['colorTint', 'wave']);
    });

    it('leaves the pipeline unchanged for an out-of-range index', () => {
      const result = threeEffects().removeAt(5);
      expect(result.effects.map((e) => e.type)).toEqual(['colorTint', 'vignette', 'wave']);
    });

    it('does not mutate the original', () => {
      const original = threeEffects();
      original.removeAt(0);
      expect(original.length).toBe(3);
    });
  });

  describe('move', () => {
    const threeEffects = () =>
      EditPipeline.empty()
        .append('colorTint' as ShaderType, {})
        .append('vignette' as ShaderType, {})
        .append('wave' as ShaderType, {});

    it('moves an effect later in the order', () => {
      const result = threeEffects().move(0, 2);
      expect(result.effects.map((e) => e.type)).toEqual(['vignette', 'wave', 'colorTint']);
    });

    it('moves an effect earlier in the order', () => {
      const result = threeEffects().move(2, 0);
      expect(result.effects.map((e) => e.type)).toEqual(['wave', 'colorTint', 'vignette']);
    });

    it('leaves the pipeline unchanged for an out-of-range index', () => {
      const result = threeEffects().move(0, 9);
      expect(result.effects.map((e) => e.type)).toEqual(['colorTint', 'vignette', 'wave']);
    });

    it('does not mutate the original', () => {
      const original = threeEffects();
      original.move(0, 2);
      expect(original.effects.map((e) => e.type)).toEqual(['colorTint', 'vignette', 'wave']);
    });
  });
});
