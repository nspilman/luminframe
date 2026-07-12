import { Color } from '@/domain/value-objects/Color'
import { Image } from '@/domain/models/Image'

/**
 * Turns the committed effect stack into the plain-JSON `recipe` stored on a
 * com.luminframe.image record. Effect params are domain values — numbers, but
 * also `Color` instances, `Float32Array`s, and even the source `Image` — so they
 * can't go into a record as-is. This flattens each to serializable JSON and,
 * crucially, DROPS images: an `imageTexture` param is the source photo, not
 * recipe data, and must never be embedded in the record.
 *
 * Colors serialize to hex (round-trippable via Color.fromHex on reconstruction,
 * which knows a given param is a color from the effect's input definition).
 * Pure and exhaustively tested — this is the boundary where a wrong case would
 * either bloat the record with an image or silently lose a parameter.
 */

export type RecipeParamValue = number | string | boolean | number[]

export interface RecipeStep {
  type: string
  params?: Record<string, RecipeParamValue>
}

/** Serialize one param value to JSON, or undefined if it isn't recipe data. */
export function serializeParamValue(value: unknown): RecipeParamValue | undefined {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Color) return value.toHex()
  if (value instanceof Float32Array) return Array.from(value)
  if (Array.isArray(value) && value.every((n) => typeof n === 'number')) return value
  // Image, null, or anything else is not recipe data — drop it.
  return undefined
}

/** Flatten the committed effect stack into the record's `recipe` array. */
export function serializeRecipe(
  effects: ReadonlyArray<{ type: string; params?: Record<string, unknown> }>
): RecipeStep[] {
  return effects.map((effect) => {
    const params: Record<string, RecipeParamValue> = {}
    for (const [key, value] of Object.entries(effect.params ?? {})) {
      const serialized = serializeParamValue(value)
      if (serialized !== undefined) params[key] = serialized
    }
    return Object.keys(params).length > 0 ? { type: effect.type, params } : { type: effect.type }
  })
}
