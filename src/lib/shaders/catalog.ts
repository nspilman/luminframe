import { ShaderType } from '@/types/shader'

/**
 * The curated taxonomy of effects — what family each belongs to and a one-line
 * plain-speech blurb for each. This is the single source of truth the UI reads
 * to group and describe effects, and the repository reads instead of inferring
 * categories from string heuristics.
 *
 * It's stated, not guessed: an effect's family and the words that describe it
 * are editorial decisions about how the library should *read* to a person, which
 * no amount of inspecting the shader source can recover. Grouping by what an
 * effect *does* to an image lets the eye learn the territory once and navigate
 * by family thereafter, instead of re-scanning sixteen strangers every visit.
 *
 * The keystone test (catalog.test.ts) pins the invariant that every registered
 * shader belongs to exactly one family — so an effect can never be added to the
 * library and silently fall out of the navigation.
 */

export type EffectCategory =
  | 'tone'
  | 'color'
  | 'soften'
  | 'distort'
  | 'stylize'
  | 'composite'

export interface EffectFamily {
  id: EffectCategory
  /** The section heading the user reads. */
  label: string
  /** Effects in this family, in the order they should appear. */
  effects: ShaderType[]
}

/**
 * Families in display order, each effect in display order within it. The order
 * here *is* the order of the picker — curated, not alphabetical, so kindred
 * effects sit together and the strongest/most-reached-for lead each family.
 */
export const effectFamilies: EffectFamily[] = [
  {
    id: 'tone',
    label: 'Tone',
    effects: ['blackAndWhite', 'luminanceQuantize', 'lightThresholdSwap'],
  },
  {
    id: 'color',
    label: 'Color',
    effects: ['colorTint', 'hueSwap', 'colorQuantize'],
  },
  {
    id: 'soften',
    label: 'Soften',
    effects: ['gaussianBlur', 'dream', 'vignette'],
  },
  {
    id: 'distort',
    label: 'Distort',
    effects: ['wave', 'kaleidoscope', 'pixelate', 'rgbSplit'],
  },
  {
    id: 'stylize',
    label: 'Stylize',
    effects: ['neonGlow', 'glitch'],
  },
  {
    id: 'composite',
    label: 'Composite',
    effects: ['blend'],
  },
]

/**
 * One-line "what it does / when to reach for it" per effect, in the user's
 * words. Kept short enough to sit under a thumbnail without crowding it.
 */
export const effectBlurbs: Record<ShaderType, string> = {
  blackAndWhite: 'Drain to grayscale',
  luminanceQuantize: 'Flatten to tone bands',
  lightThresholdSwap: 'Split light from dark',
  colorTint: 'Wash in one hue',
  hueSwap: 'Rotate the colors',
  colorQuantize: 'Reduce to a few colors',
  gaussianBlur: 'Soften with blur',
  dream: 'Blur and brighten to a glow',
  vignette: 'Darken toward the edges',
  wave: 'Ripple the pixels',
  kaleidoscope: 'Mirror into petals',
  pixelate: 'Coarsen into blocks',
  rgbSplit: 'Offset the color channels',
  neonGlow: 'Light up the bright areas',
  glitch: 'Tear with digital noise',
  blend: 'Mix in a second image',
}

const categoryByType: Record<ShaderType, EffectCategory> = Object.fromEntries(
  effectFamilies.flatMap((family) => family.effects.map((type) => [type, family.id]))
) as Record<ShaderType, EffectCategory>

/** The family an effect belongs to. Total over registeredShaders (see catalog.test.ts). */
export function categoryOf(type: ShaderType): EffectCategory {
  return categoryByType[type]
}

/** The plain-speech blurb for an effect. */
export function blurbOf(type: ShaderType): string {
  return effectBlurbs[type]
}
