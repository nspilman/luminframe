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

export const shaderLibrary: Record<ShaderType, ShaderEffect> = {
  blackAndWhite,
  tint: colorTint,
  pixelateEffect: pixelate,
  rgbSplit,
  vignette,
  wave,
  kaleidoscopeEffect: kaleidoscope,
  neonGlowEffect: neonGlow,
  glitch,
  dream,
  blend,
  lightThresholdSwap,
  gaussianBlur,
  hueSwap,
  colorQuantize,
  luminanceQuantize
};