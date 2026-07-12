import { reconcileShaderParams, freshDraftParams } from './useShaderEditor';
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

// freshDraftParams builds the draft that opens right after an effect is applied.
// Unlike reconcileShaderParams (an effect switch, where tuned values survive),
// Apply resets the knobs to defaults but must keep the loaded source image.
describe('freshDraftParams', () => {
  it('carries the source image into the fresh draft', () => {
    // hasImage is derived from imageTexture; dropping it here would send the
    // editor back to its dormant, image-less state the instant Apply is clicked.
    const image = new Image('img-1', new Dimensions(4, 2), { url: 'blob:test' });
    const result = freshDraftParams({ imageTexture: image, intensity: 0.8 }, { intensity: 0.5 });
    expect(result.imageTexture).toBe(image);
  });

  it('resets a tuned knob back to the effect default', () => {
    // The tuned value was just committed into the pipeline, so the new draft
    // starts clean — it must not inherit the previous value the way a switch does.
    const result = freshDraftParams({ intensity: 0.8 }, { intensity: 0.5 });
    expect(result.intensity).toBe(0.5);
  });
});
