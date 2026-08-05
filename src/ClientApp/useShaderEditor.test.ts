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

  it('retains a loaded image even when the new defaults omit it', () => {
    // A second-image input (blend, displacement) costs the user a file pick, so
    // it survives a switch to an effect whose defaults don't mention it.
    const image = new Image('img-1', new Dimensions(4, 2), { url: 'blob:test' });
    const result = reconcileShaderParams({ imageTextureTwo: image }, { intensity: 0.5 });
    expect(result.imageTextureTwo).toBe(image);
  });

  it('drops a scalar setting that belongs only to the previous effect', () => {
    // Leaving an effect forgets its unique knobs, so the params mirror the new
    // effect's surface — no stale key reaches the renderer as a phantom uniform.
    const result = reconcileShaderParams({ intensity: 0.8, splitOffset: 0.005 }, { intensity: 0.5 });
    expect('splitOffset' in result).toBe(false);
  });

  it('clamps a carried number into the new effect range', () => {
    // 'amount' is 3.0 in the effect being left but ranges -1..1 in the new one;
    // the carried value is clamped so the slider stays honest.
    const result = reconcileShaderParams(
      { amount: 3.0 },
      { amount: 0.4 },
      { amount: { type: 'range', label: 'Amount', min: -1, max: 1, step: 0.01 } }
    );
    expect(result.amount).toBe(1);
  });
});
