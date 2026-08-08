import { useCallback, useMemo, useRef, useState } from 'react'
import { fetchNetworkEffectRecords } from '@/infrastructure/atproto/effectRecords'
import { parseAtUri, resolveIdentity } from '@/infrastructure/atproto/luminframeFeed'
import { buildCustomEffectEntries, CustomEffectEntry } from './useCustomEffects'

/**
 * Effects published by anyone on the network, loaded on demand.
 *
 * On demand is the point. Every record fetched is compile-gated on arrival
 * (buildCustomEffectEntries), which means real GPU work per stranger's shader —
 * fine when the user has asked to browse, wasteful on every cold load of the
 * editor. So this starts idle and does nothing until `load` is called; the
 * surface that shows the effects is the thing that asks for them.
 *
 * Records that fail the grammar or the compiler are dropped rather than
 * surfaced. That is the opposite of useCustomEffects, which keeps its skipped
 * records so an author can see and fix their own broken shader — a stranger's
 * broken record is not the viewer's problem and not theirs to repair.
 */
export interface NetworkEffectsState {
  status: 'idle' | 'loading' | 'loaded'
  entries: CustomEffectEntry[]
  /** Handle by author DID, for crediting each effect. Missing if it wouldn't resolve. */
  handles: Record<string, string>
  /** Repos beyond the fan-out cap, left unread. Zero unless the network outgrew it. */
  unreadRepos: number
  /** Begin loading. A no-op once loading has started. */
  load: () => void
}

type Loaded = Omit<NetworkEffectsState, 'load'>

const IDLE: Loaded = { status: 'idle', entries: [], handles: {}, unreadRepos: 0 }

/**
 * Handles for the authors who actually produced an effect — resolveIdentity is
 * memoized and already ran for each of these DIDs during the record fetch, so
 * this is cache hits rather than a second round of network calls.
 */
export async function handlesFor(entries: readonly CustomEffectEntry[]): Promise<Record<string, string>> {
  const dids = [...new Set(entries.map((e) => parseAtUri(e.key)?.did).filter(Boolean) as string[])]
  const resolved = await Promise.all(dids.map(async (did) => [did, (await resolveIdentity(did)).handle] as const))
  return Object.fromEntries(resolved.filter(([, handle]) => handle)) as Record<string, string>
}

export function useNetworkEffects(): NetworkEffectsState {
  const [state, setState] = useState<Loaded>(IDLE)
  // The once-only latch. A ref rather than a read of `status` inside a state
  // updater: the fan-out is one request per author, and an updater React is
  // free to call more than once is no place to start it from.
  const startedRef = useRef(false)

  const load = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setState((prev) => ({ ...prev, status: 'loading' }))
    fetchNetworkEffectRecords()
      .then(async ({ records, unreadRepos }) => {
        const { entries } = buildCustomEffectEntries(records)
        setState({ status: 'loaded', entries, handles: await handlesFor(entries), unreadRepos })
      })
      .catch(() => {
        // The relay or a PDS is unreachable. Land on an empty loaded state —
        // "nobody to show right now" reads the same to the user as an empty
        // network, and leaves the section closable rather than stuck loading.
        setState({ ...IDLE, status: 'loaded' })
      })
  }, [])

  return useMemo(() => ({ ...state, load }), [state, load])
}
