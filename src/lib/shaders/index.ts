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

export const shaderLibrary: Record<ShaderType, ShaderEffect> = {
  test: colorTint,
  pixelateEffect: pixelate,
  rgbSplit,
  vignette,
  wave,
  kaleidoscopeEffect: kaleidoscope,
  neonGlowEffect: neonGlow,
  glitch,
  dream
};