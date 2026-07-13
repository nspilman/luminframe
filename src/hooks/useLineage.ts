import { useEffect, useState } from 'react'
import {
  fetchAncestry,
  fetchRemixesOf,
  LuminframeImageView,
} from '@/infrastructure/atproto/luminframeFeed'

export interface Lineage {
  status: 'loading' | 'loaded' | 'error'
  /** The remix chain above this image, oldest first (root … immediate parent). */
  ancestors: LuminframeImageView[]
  /** The direct remixes of this image, newest first. */
  children: LuminframeImageView[]
}

const EMPTY: Lineage = { status: 'loading', ancestors: [], children: [] }

/**
 * Resolve one image's family: the chain of records it descends from, and the
 * records that descend from it. Ancestry is a cheap walk up the remixOf links;
 * children need a network scan (there's no reverse index), so this is the image
 * page's work, not the lightbox's. Re-runs when the image identity changes and
 * drops a result that arrives after the page moved on.
 */
export function useLineage(image: LuminframeImageView | null): Lineage {
  const [lineage, setLineage] = useState<Lineage>(EMPTY)

  useEffect(() => {
    if (!image) {
      setLineage(EMPTY)
      return
    }
    let active = true
    setLineage({ status: 'loading', ancestors: [], children: [] })

    Promise.all([fetchAncestry(image), fetchRemixesOf(image.uri)])
      .then(([ancestors, children]) => {
        if (active) setLineage({ status: 'loaded', ancestors, children })
      })
      .catch(() => {
        if (active) setLineage({ status: 'error', ancestors: [], children: [] })
      })

    return () => {
      active = false
    }
  }, [image?.uri])

  return lineage
}
