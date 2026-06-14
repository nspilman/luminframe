import { reconcileShaderParams } from './useShaderEditor';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';

// reconcileShaderParams decides which parameter values survive an effect
// switch. The rule: new defaults fill the base, previous values win on top.
describe('reconcileShaderParams', () => {
  it('keeps the previous value for a parameter shared by both effects', () => {
    const result = reconcileShaderParams({ intensity: 0.8 }, { intensity: 0.5 });
    expect(result.intensity).toBe(0.8);
  });

  it('adds the default for a parameter the new effect introduces', () => {
    const result = reconcileShaderParams({ intensity: 0.8 }, { intensity: 0.5, radius: 3 });
    expect(result.radius).toBe(3);
  });

  it('retains the loaded image even when the new defaults omit it', () => {
    // The source image lives under imageTexture; switching to an effect whose
    // defaults don't mention it must not drop the user's loaded image.
    const image = new Image('img-1', new Dimensions(4, 2), { url: 'blob:test' });
    const result = reconcileShaderParams({ imageTexture: image }, { intensity: 0.5 });
    expect(result.imageTexture).toBe(image);
  });

  it('drops a scalar setting that belongs only to the previous effect', () => {
    // Leaving an effect forgets its unique knobs, so the params mirror the new
    // effect's surface — no stale key reaches the renderer as a phantom uniform.
    const result = reconcileShaderParams({ intensity: 0.8, splitOffset: 0.005 }, { intensity: 0.5 });
    expect('splitOffset' in result).toBe(false);
  });
});
