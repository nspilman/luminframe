import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchImageByUri } from '@/infrastructure/atproto/luminframeFeed'
import { hydrateRecipe, HydratedStep } from '@/lib/shaders/hydrateRecipe'
import { RECIPE_PARAM } from '@/lib/galleryRoute'

/**
 * Honors the editor's ?recipe=<at-uri> address: resolves the record, hydrates its
 * saved recipe into editor-ready effects, and applies them to the current image
 * as a filter — then clears the param so a reload or Back doesn't re-apply. Like
 * remix, the action is just a link to this address; unlike remix, it brings the
 * *look* (the effect stack), not the image.
 */
export function useApplyRecipe(applyRecipe: (steps: HydratedStep[]) => void): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const recipeUri = searchParams.get(RECIPE_PARAM)

  const applyRef = useRef(applyRecipe)
  applyRef.current = applyRecipe

  useEffect(() => {
    if (!recipeUri) return
    let active = true

    const clearParam = () =>
      setSearchParams(
        (prev) => {
          prev.delete(RECIPE_PARAM)
          return prev
        },
        { replace: true }
      )

    ;(async () => {
      const view = await fetchImageByUri(recipeUri)
      const steps = view?.recipe ? hydrateRecipe(view.recipe) : []
      if (!active) return
      if (steps.length > 0) applyRef.current(steps)
      clearParam()
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeUri])
}
