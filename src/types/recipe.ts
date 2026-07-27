/**
 * The shape of a saved edit recipe — one home, shared across the write and read
 * paths. Two forms are deliberately kept distinct:
 *
 *   - RecipeStep: what Luminframe *writes* — params already flattened to
 *     constrained JSON (see serializeRecipe).
 *   - RawRecipeStep: what we *read* from a record — params are `unknown` until
 *     validated back into editor types (see hydrateRecipe), because a record
 *     from the network is untrusted.
 */

import { StepParamValue } from '@/effects-contract'

/**
 * A recipe param value, once serialized to plain JSON — the same shapes the
 * recipe record grammar accepts as step params, aliased so the two can never
 * drift apart.
 */
export type RecipeParamValue = StepParamValue

/** One effect in a written recipe: its key and its serialized params. */
export interface RecipeStep {
  type: string
  params?: Record<string, RecipeParamValue>
}

/** One effect in a recipe read from an untrusted record: params not yet validated. */
export interface RawRecipeStep {
  type: string
  params?: Record<string, unknown>
}
