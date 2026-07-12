import { ShaderEffect, ShaderType } from '@/types/shader';
import { colorTint } from '@/lib/shaders/effects/color-tint'
import { pixelate } from '@/lib/shaders/effects/pixelate'
import { rgbSplit } from '@/lib/shaders/effects/rgb-split';
import { vignette } from '@/lib/shaders/effects/vignette';
import { wave } from '@/lib/shaders/effects/wave';
import { kaleidoscope } from '@/lib/shaders/effects/kaleidoscope';
import { neonGlow } from '@/lib/shaders/effects/neon-glow';
import { glitch } from '@/lib/shaders/effects/glitch';
import { dream } from '@/lib/shaders/effects/dream';
import { blend } from './effects/blend';
import { lightThresholdSwap } from './effects/light-threshold-swap';
import { gaussianBlur } from './effects/gaussian-blur';
import { hueSwap } from './effects/hue-swap';
import { blackAndWhite } from './effects/black-and-white';
import { colorQuantize } from './effects/color-quantize';
import { luminanceQuantize } from './effects/luminance-quantize';
import { sharpen } from './effects/sharpen';
import { filmGrain } from './effects/film-grain';
import { outline } from './effects/outline';
import { vibrance } from './effects/vibrance';
import { sepia } from './effects/sepia';
import { duotone } from './effects/duotone';
import { splitTone } from './effects/split-tone';
import { bloom } from './effects/bloom';
import { lightLeak } from './effects/light-leak';
import { godRays } from './effects/god-rays';
import { chromaticAberration } from './effects/chromatic-aberration';
import { lensDistortion } from './effects/lens-distortion';
import { swirl } from './effects/swirl';
import { tiltShift } from './effects/tilt-shift';

export const shaderLibrary: Record<ShaderType, ShaderEffect> = {
  blackAndWhite,
  colorQuantize,
  luminanceQuantize,
  colorTint,
  pixelate,
  rgbSplit,
  vignette,
  wave,
  kaleidoscope,
  neonGlow,
  glitch,
  dream,
  blend,
  lightThresholdSwap,
  gaussianBlur,
  hueSwap,
  sharpen,
  filmGrain,
  outline,
  vibrance,
  sepia,
  duotone,
  splitTone,
  bloom,
  lightLeak,
  godRays,
  chromaticAberration,
  lensDistortion,
  swirl,
  tiltShift,
};