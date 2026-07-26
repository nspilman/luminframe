import { Color } from '@/domain/value-objects/Color'
import { Image } from '@/domain/models/Image'
import { EffectKey, EffectRegistry, ShaderInputVars } from '@/types/shader'
import { RawRecipeStep } from '@/types/recipe'

/**
 * The inverse of serializeRecipe: turns a stored recipe (plain JSON effect steps)
 * back into editor-ready effects, so a saved look can be re-applied. Each stored
 * param is coerced to the runtime type of that effect's *default* for the same
 * key — the default is the type oracle, so a hex string becomes a Color, a number
 * stays a number, and so on, with no separate schema to keep in sync.
 *
 * Unknown effects and unknown params are dropped; anything missing keeps its
 * default. Images are never hydrated from a recipe (they aren't stored there) —
 * the source is supplied separately by the pipeline.
 */

/** One effect ready to append to an EditPipeline. */
export interface HydratedStep {
  type: EffectKey
  params: ShaderInputVars
}

/** Coerce a stored JSON value to the runtime type of the effect's default. */
export function coerceToDefault(stored: unknown, sample: unknown): unknown {
  if (sample instanceof Color) {
    if (typeof stored === 'string') {
      try {
        return Color.fromHex(stored)
      } catch {
        return sample
      }
    }
    if (Array.isArray(stored) && stored.length >= 3) {
      try {
        return Color.fromFloat32Array(stored as number[])
      } catch {
        return sample
      }
    }
    return sample
  }
  if (typeof sample === 'number') return typeof stored === 'number' ? stored : sample
  if (typeof sample === 'boolean') return typeof stored === 'boolean' ? stored : sample
  if (sample instanceof Float32Array) return Array.isArray(stored) ? new Float32Array(stored as number[]) : sample
  if (Array.isArray(sample)) return Array.isArray(stored) ? stored : sample
  if (sample instanceof Image) return sample // the source is supplied by the pipeline, not the recipe
  return stored ?? sample
}

// `registry` is required, not defaulted to the builtin library on purpose: the
// production caller must pass the live registry (builtins + loaded custom
// effects), and a convenient default would let a caller silently drop custom
// steps and still compile.
export function hydrateRecipe(
  recipe: ReadonlyArray<RawRecipeStep>,
  registry: EffectRegistry
): HydratedStep[] {
  const steps: HydratedStep[] = []
  for (const step of recipe) {
    if (!(step.type in registry)) continue // effect this client can't resolve — drop it
    const type = step.type
    const defaults = registry[type].defaultValues
    const params: Record<string, unknown> = { ...defaults }
    for (const [key, stored] of Object.entries(step.params ?? {})) {
      if (key in defaults) params[key] = coerceToDefault(stored, defaults[key])
    }
    steps.push({ type, params: params as ShaderInputVars })
  }
  return steps
}
