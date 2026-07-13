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
  | 'optics'
  | 'stylize'
  | 'light'
  | 'texture'
  | 'composite'
  | 'time'

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
    // A grading suite ordered from subtle adjustment to full remap: boost, tint,
    // grade, map to two colors, age, rotate, then reduce.
    id: 'color',
    label: 'Color',
    effects: ['vibrance', 'colorTint', 'splitTone', 'duotone', 'sepia', 'hueSwap', 'colorQuantize'],
  },
  {
    // Everything that governs sharpness and where the eye rests — a sharp-to-soft
    // spectrum from crisp detail down to a dream, plus the vignette that steers
    // attention inward.
    id: 'soften',
    label: 'Focus',
    effects: ['sharpen', 'gaussianBlur', 'dream', 'vignette'],
  },
  {
    id: 'distort',
    label: 'Distort',
    effects: ['wave', 'kaleidoscope', 'pixelate', 'rgbSplit', 'liquify'],
  },
  {
    // Where Distort bends geometry, Optics bends light — the failures and
    // curvature of a real lens: fringing, barrel, focus falloff, vortex.
    id: 'optics',
    label: 'Optics',
    effects: ['chromaticAberration', 'lensDistortion', 'tiltShift', 'swirl'],
  },
  {
    id: 'stylize',
    label: 'Stylize',
    effects: ['neonGlow', 'glitch', 'outline', 'crystallize'],
  },
  {
    // Additive light — glow, leaks, and shafts that add illumination rather than
    // recolor. Every one screens or adds, so it only ever brightens.
    id: 'light',
    label: 'Light',
    effects: ['bloom', 'lightLeak', 'godRays'],
  },
  {
    // The analog, tactile layer — grain, ink, dots, and screens laid over the
    // image, from film stock to newsprint to a cathode-ray tube.
    id: 'texture',
    label: 'Texture',
    effects: ['filmGrain', 'halftone', 'crossHatch', 'dither', 'crt'],
  },
  {
    id: 'composite',
    label: 'Composite',
    effects: ['blend', 'displacement'],
  },
  {
    // The temporal dimension — effects that read the previous frame and feed
    // back on themselves, accumulating over time.
    id: 'time',
    label: 'Time',
    effects: ['echo'],
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
  vibrance: 'Boost the muted colors',
  sepia: 'Age to warm brown tones',
  duotone: 'Map tones to two colors',
  splitTone: 'Warm the lights, cool the darks',
  bloom: 'Bloom the highlights into glow',
  lightLeak: 'Leak warm light across it',
  godRays: 'Cast light rays from a point',
  chromaticAberration: 'Fringe color toward the edges',
  lensDistortion: 'Bend through a curved lens',
  swirl: 'Twist around the center',
  tiltShift: 'Keep a sharp band, blur the rest',
  halftone: 'Break into printer dots',
  dither: 'Dither to two tones',
  crt: 'Old CRT scanlines and curve',
  crossHatch: 'Sketch with pencil hatching',
  liquify: 'Melt with flowing noise',
  crystallize: 'Shatter into glass cells',
  displacement: 'Warp through a second image',
  echo: 'Trail and tunnel over time',
  gaussianBlur: 'Soften with blur',
  dream: 'Blur and brighten to a glow',
  vignette: 'Darken toward the edges',
  wave: 'Ripple the pixels',
  kaleidoscope: 'Mirror into petals',
  pixelate: 'Coarsen into blocks',
  rgbSplit: 'Offset the color channels',
  neonGlow: 'Light up the bright areas',
  glitch: 'Tear with digital noise',
  outline: 'Trace the edges',
  filmGrain: 'Add analog film grain',
  sharpen: 'Bring out fine detail',
  blend: 'Mix in a second image',
}

const categoryByType: Record<ShaderType, EffectCategory> = Object.fromEntries(
  effectFamilies.flatMap((family) => family.effects.map((type) => [type, family.id]))
) as Record<ShaderType, EffectCategory>

/** The family an effect belongs to. Total over registeredShaders (see catalog.test.ts). */
export function categoryOf(type: ShaderType): EffectCategory {
  return categoryByType[type]
}

/** True when a string is one of the known family ids — guards a value from the URL. */
export function isEffectCategory(value: string): value is EffectCategory {
  return effectFamilies.some((family) => family.id === value)
}

/**
 * The families present among a set of effect keys, unknown keys ignored. This is
 * the one primitive the gallery's "discover by look" builds on: the filter
 * predicate is `familiesOf(image.effects).has(family)`, and the filter rail is the
 * union of this over the feed — so a look is only offered when something wears it.
 *
 * Effect keys come off network records, so a key this build doesn't know (a newer
 * effect, say) contributes no family rather than throwing — the same forgiving
 * read the rest of the feed layer takes toward unfamiliar data.
 */
export function familiesOf(effectKeys: readonly string[]): Set<EffectCategory> {
  const families = new Set<EffectCategory>()
  for (const key of effectKeys) {
    const family = categoryByType[key as ShaderType]
    if (family) families.add(family)
  }
  return families
}

/** The plain-speech blurb for an effect. */
export function blurbOf(type: ShaderType): string {
  return effectBlurbs[type]
}
