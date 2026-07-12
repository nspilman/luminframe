import { Color } from '@/domain/value-objects/Color'
import { Image } from '@/domain/models/Image'
import { shaderLibrary } from '@/lib/shaders'
import { ShaderType, ShaderInputVars } from '@/types/shader'

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
  type: ShaderType
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

export function hydrateRecipe(
  recipe: ReadonlyArray<{ type: string; params?: Record<string, unknown> }>
): HydratedStep[] {
  const steps: HydratedStep[] = []
  for (const step of recipe) {
    if (!(step.type in shaderLibrary)) continue // effect this build doesn't know — drop it
    const type = step.type as ShaderType
    const defaults = shaderLibrary[type].defaultValues
    const params: Record<string, unknown> = { ...defaults }
    for (const [key, stored] of Object.entries(step.params ?? {})) {
      if (key in defaults) params[key] = coerceToDefault(stored, defaults[key])
    }
    steps.push({ type, params: params as ShaderInputVars })
  }
  return steps
}
