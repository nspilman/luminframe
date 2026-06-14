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
      const pipeline = EditPipeline.empty().append('tint' as ShaderType, {});
      expect(pipeline.withSource(makeImage()).length).toBe(1);
    });
  });

  describe('append', () => {
    it('adds the effect at the end', () => {
      const pipeline = EditPipeline.empty()
        .append('tint' as ShaderType, { a: 1 })
        .append('vignette' as ShaderType, { b: 2 });

      expect(pipeline.effects.map((e) => e.type)).toEqual(['tint', 'vignette']);
    });

    it('carries the params it was committed with', () => {
      const pipeline = EditPipeline.empty().append('tint' as ShaderType, { a: 1 });
      expect(pipeline.effects[0].params).toEqual({ a: 1 });
    });

    it('does not mutate the original', () => {
      const original = EditPipeline.empty();
      original.append('tint' as ShaderType, {});
      expect(original.length).toBe(0);
    });
  });
});
