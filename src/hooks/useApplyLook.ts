import { EffectRegistry } from '@/types/shader'
import { parseRecipeRecord } from '@/effects-contract'
import { fetchRecordByUri } from '@/infrastructure/atproto/repoRecords'
import { HydratedStep, hydrateRecipe } from '@/lib/shaders/hydrateRecipe'
import { applyMacroValues } from '@/lib/shaders/macros'
import { registryWithForeign, resolveForeignEffects } from '@/lib/shaders/foreignEffects'
import { LOOK_PARAM } from '@/lib/galleryRoute'
import { useUrlParamAction } from './useUrlParamAction'

/**
 * Honor /?look=<at-uri>: fetch that Look record, resolve any of its steps
 * that reference other authors' effects, and bring its chain onto the editor
 * — macro knobs at the author's defaults. Same replace semantics as ?recipe=
 * (a shared link means "show me this look"; the previous stack is one undo
 * away), including the wait-for-image half.
 */
export function useApplyLook(
  applyRecipe: (steps: HydratedStep[]) => void,
  registry: EffectRegistry,
  registryReady: boolean
): void {
  useUrlParamAction(
    LOOK_PARAM,
    async (uri) => {
      const record = await fetchRecordByUri(uri)
      if (!record) return []
      const parsed = parseRecipeRecord(record.value)
      if (!parsed.ok) {
        console.warn(`Look ${uri} failed validation:`, parsed.errors)
        return []
      }
      const { unresolved } = await resolveForeignEffects(
        parsed.def.steps.map((s) => s.type),
        registry
      )
      for (const u of unresolved) {
        console.warn(`Look step ${u.key} won't apply:`, u.reasons)
      }
      const merged = registryWithForeign(registry)
      return hydrateRecipe(applyMacroValues(parsed.def, {}, merged), merged)
    },
    (steps) => {
      if (steps.length > 0) applyRecipe(steps)
    },
    registryReady
  )
}
