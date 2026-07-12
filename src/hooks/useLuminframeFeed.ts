import { useEffect, useState } from 'react'
import {
  fetchNetworkImages,
  fetchRepoImages,
  LuminframeImageView,
} from '@/infrastructure/atproto/luminframeFeed'

export type FeedTab = 'mine' | 'network'

export type FeedStatus = 'loading' | 'loaded' | 'error' | 'signed-out'

export interface FeedState {
  status: FeedStatus
  images: LuminframeImageView[]
  error: string | null
}

/**
 * Loads a Luminframe image feed: the signed-in user's own records ("mine") or
 * everyone's across the network. The "mine" feed needs a DID to know whose repo
 * to read, so it reports `signed-out` until one is available; the network feed is
 * public and loads regardless. Re-fetches when the tab or DID changes, and drops
 * a result that arrives after the inputs moved on.
 */
export function useLuminframeFeed(tab: FeedTab, did: string | null): FeedState {
  const [state, setState] = useState<FeedState>({ status: 'loading', images: [], error: null })

  useEffect(() => {
    if (tab === 'mine' && !did) {
      setState({ status: 'signed-out', images: [], error: null })
      return
    }

    let active = true
    setState((prev) => ({ ...prev, status: 'loading', error: null }))

    const load = tab === 'network' ? fetchNetworkImages() : fetchRepoImages(did as string)
    load
      .then((images) => {
        if (active) setState({ status: 'loaded', images, error: null })
      })
      .catch((err) => {
        if (active) setState({ status: 'error', images: [], error: String(err?.message ?? err) })
      })

    return () => {
      active = false
    }
  }, [tab, did])

  return state
}
