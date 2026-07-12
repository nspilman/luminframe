import { useEffect, useState } from 'react'
import { fetchImageByUri, LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'

/**
 * Resolves the ?image=<at-uri> deep link to a view. Prefers the copy already in
 * the loaded feed (free, instant); falls back to a standalone getRecord when the
 * record isn't in the current feed — the case that makes a cold-loaded or shared
 * link actually restore the image instead of opening to nothing.
 *
 * Returns null while a standalone fetch is in flight or when there's no open URI.
 */
export function useOpenImage(
  uri: string | null,
  feedImages: LuminframeImageView[]
): LuminframeImageView | null {
  const fromFeed = uri ? feedImages.find((i) => i.uri === uri) ?? null : null
  const [fetched, setFetched] = useState<LuminframeImageView | null>(null)

  useEffect(() => {
    // In the feed already, or nothing open: no standalone fetch needed.
    if (!uri || fromFeed) {
      setFetched(null)
      return
    }
    let active = true
    fetchImageByUri(uri).then((view) => {
      if (active) setFetched(view)
    })
    return () => {
      active = false
    }
  }, [uri, fromFeed?.uri])

  return fromFeed ?? fetched
}
