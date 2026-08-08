import { useCallback, useMemo, useRef, useState } from 'react'
import { FetchedCollection, fetchNetworkCollections } from '@/infrastructure/atproto/effectRecords'
import { resolveIdentity } from '@/infrastructure/atproto/luminframeFeed'

/**
 * Collections published by anyone on the network, loaded on demand — the
 * discovery half of following. Same posture as useNetworkEffects: idle until
 * a surface asks, honest about the fan-out cap, and a failure lands on an
 * empty loaded state rather than a stuck spinner. Cheaper than the effect
 * fan-out, though — collections are metadata; no shader compiles happen until
 * one is followed.
 */

export interface NetworkCollection extends FetchedCollection {
  curatorHandle?: string
}

export interface NetworkCollectionsState {
  status: 'idle' | 'loading' | 'loaded'
  collections: NetworkCollection[]
  unreadRepos: number
  load: () => void
}

type Loaded = Omit<NetworkCollectionsState, 'load'>

const IDLE: Loaded = { status: 'idle', collections: [], unreadRepos: 0 }

export function useNetworkCollections(): NetworkCollectionsState {
  const [state, setState] = useState<Loaded>(IDLE)
  const startedRef = useRef(false)

  const load = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setState((prev) => ({ ...prev, status: 'loading' }))
    fetchNetworkCollections()
      .then(async ({ collections, unreadRepos }) => {
        const withHandles = await Promise.all(
          collections.map(async (c) => {
            const handle = (await resolveIdentity(c.curatorDid)).handle ?? undefined
            return { ...c, ...(handle ? { curatorHandle: handle } : {}) }
          })
        )
        setState({ status: 'loaded', collections: withHandles, unreadRepos })
      })
      .catch(() => {
        setState({ ...IDLE, status: 'loaded' })
      })
  }, [])

  return useMemo(() => ({ ...state, load }), [state, load])
}
