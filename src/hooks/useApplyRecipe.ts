import { fetchImageByUri } from '@/infrastructure/atproto/luminframeFeed'
import { hydrateRecipe, HydratedStep } from '@/lib/shaders/hydrateRecipe'
import { EffectRegistry } from '@/types/shader'
import { RECIPE_PARAM } from '@/lib/galleryRoute'
import { useUrlParamAction } from './useUrlParamAction'

/**
 * Honors the editor's ?recipe=<at-uri> address: resolves the record, hydrates its
 * saved recipe into editor-ready effects, and applies them to the current image
 * as a filter. Like remix, the action is just a link to this address; unlike
 * remix, it brings the *look* (the effect stack), not the image. useUrlParamAction
 * clears the param once honored (see there for the semantics).
 *
 * The instruction waits for `registryReady`: a recipe may reference the user's
 * custom effects, and hydrating against a registry still being fetched would
 * silently drop those steps.
 */
export function useApplyRecipe(
  applyRecipe: (steps: HydratedStep[]) => void,
  registry: EffectRegistry,
  registryReady: boolean
): void {
  useUrlParamAction(
    RECIPE_PARAM,
    async (uri) => {
      const view = await fetchImageByUri(uri)
      return view?.recipe ? hydrateRecipe(view.recipe, registry) : []
    },
    (steps) => {
      if (steps.length > 0) applyRecipe(steps)
    },
    registryReady
  )
}
