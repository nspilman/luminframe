import { fetchImageByUri } from '@/infrastructure/atproto/luminframeFeed'
import { hydrateRecipe, HydratedStep } from '@/lib/shaders/hydrateRecipe'
import { RECIPE_PARAM } from '@/lib/galleryRoute'
import { useUrlParamAction } from './useUrlParamAction'

/**
 * Honors the editor's ?recipe=<at-uri> address: resolves the record, hydrates its
 * saved recipe into editor-ready effects, and applies them to the current image
 * as a filter. Like remix, the action is just a link to this address; unlike
 * remix, it brings the *look* (the effect stack), not the image. useUrlParamAction
 * clears the param once honored (see there for the semantics).
 */
export function useApplyRecipe(applyRecipe: (steps: HydratedStep[]) => void): void {
  useUrlParamAction(
    RECIPE_PARAM,
    async (uri) => {
      const view = await fetchImageByUri(uri)
      return view?.recipe ? hydrateRecipe(view.recipe) : []
    },
    (steps) => {
      if (steps.length > 0) applyRecipe(steps)
    }
  )
}
