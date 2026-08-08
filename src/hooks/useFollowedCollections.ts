import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  FetchedCollection,
  fetchCollectionByUri,
  resolveCollectionEffects,
} from '@/infrastructure/atproto/effectRecords'
import { resolveIdentity } from '@/infrastructure/atproto/luminframeFeed'
import { buildCustomEffectEntries, CustomEffectEntry } from './useCustomEffects'
import { handlesFor } from './useNetworkEffects'
import { rekeyOfficialEntries } from './useOfficialEffects'

/**
 * Collections the user follows — other curators' lenses, merged into the
 * library beside the featured default. Following is choosing whose taste to
 * see through; the effects still live in their authors' repos and resolve by
 * the same grammar as every other source.
 *
 * A module-level store (like useOfficialEffects) because both the registry
 * and the picker need the same resolved set, fetched once per page load.
 *
 * Entries pass through rekeyOfficialEntries, so a collection that lists a
 * luminframe.com builtin re-keys to the short key and merges with the
 * library's copy instead of duplicating it under an at:// key.
 *
 * ponytail: the followed list lives in localStorage — per-browser, gone with
 * the profile. The atmosphere-native home is a record in the user's own repo
 * ("collections I follow", roaming with the DID); add that lexicon when
 * cross-device roaming is asked for.
 */

export const FOLLOWED_COLLECTIONS_KEY = 'luminframe.followedCollections'

export interface FollowedCollection {
  uri: string
  name: string
  description?: string
  curatorDid: string
  /** Missing only if the DID wouldn't resolve to a handle. */
  curatorHandle?: string
  /** Resolved, compile-gated, re-keyed — registry-ready. */
  entries: CustomEffectEntry[]
}

export interface FollowedCollectionsState {
  /** URIs the user follows, whether or not their fetch has landed yet. */
  followedUris: readonly string[]
  /** The fetched collections, in follow order. A collection that won't resolve is absent. */
  collections: FollowedCollection[]
  /** Handle by effect-author DID, for crediting rows. */
  handles: Record<string, string>
}

function readFollowedUris(): string[] {
  try {
    const raw = localStorage.getItem(FOLLOWED_COLLECTIONS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : []
  } catch {
    return []
  }
}

function writeFollowedUris(uris: readonly string[]): void {
  try {
    localStorage.setItem(FOLLOWED_COLLECTIONS_KEY, JSON.stringify(uris))
  } catch {
    // Full or unavailable localStorage: follows won't survive the reload, nothing worse.
  }
}

let state: FollowedCollectionsState | null = null
const fetchStartedFor = new Set<string>()
const listeners = new Set<() => void>()

function setState(next: FollowedCollectionsState): void {
  state = next
  for (const listener of listeners) listener()
}

function getState(): FollowedCollectionsState {
  if (state === null) {
    state = { followedUris: readFollowedUris(), collections: [], handles: {} }
  }
  return state
}

async function loadCollection(fetched: FetchedCollection): Promise<FollowedCollection> {
  const records = await resolveCollectionEffects(fetched.def)
  const entries = rekeyOfficialEntries(buildCustomEffectEntries(records).entries)
  const curatorHandle = (await resolveIdentity(fetched.curatorDid)).handle ?? undefined
  return {
    uri: fetched.uri,
    name: fetched.def.name,
    ...(fetched.def.description ? { description: fetched.def.description } : {}),
    curatorDid: fetched.curatorDid,
    ...(curatorHandle ? { curatorHandle } : {}),
    entries,
  }
}

function ensureFetched(uri: string): void {
  if (fetchStartedFor.has(uri)) return
  fetchStartedFor.add(uri)
  fetchCollectionByUri(uri)
    .then((fetched) => (fetched ? loadCollection(fetched) : null))
    .then(async (collection) => {
      if (!collection) return
      const current = getState()
      // Arrival order is fetch order; present in follow order at read time.
      const collections = [...current.collections.filter((c) => c.uri !== collection.uri), collection]
      setState({
        ...current,
        collections,
        handles: await handlesFor(collections.flatMap((c) => c.entries)),
      })
    })
    .catch(() => {
      // Unreachable or invalid: the follow stays in localStorage and retries
      // next page load; the section simply doesn't render this visit.
      fetchStartedFor.delete(uri)
    })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Follow: remember the URI and start resolving it. Idempotent. */
export function followCollection(uri: string): void {
  const current = getState()
  if (current.followedUris.includes(uri)) return
  const followedUris = [...current.followedUris, uri]
  writeFollowedUris(followedUris)
  setState({ ...current, followedUris })
  ensureFetched(uri)
}

/** Unfollow: forget the URI; its effects leave the registry with it. */
export function unfollowCollection(uri: string): void {
  const current = getState()
  if (!current.followedUris.includes(uri)) return
  const followedUris = current.followedUris.filter((u) => u !== uri)
  writeFollowedUris(followedUris)
  fetchStartedFor.delete(uri)
  setState({
    ...current,
    followedUris,
    collections: current.collections.filter((c) => c.uri !== uri),
  })
}

export function useFollowedCollections(): FollowedCollectionsState {
  const snapshot = useSyncExternalStore(subscribe, getState)
  useEffect(() => {
    for (const uri of snapshot.followedUris) ensureFetched(uri)
  }, [snapshot.followedUris])
  // Present in follow order regardless of which fetch landed first. Memoized
  // so downstream registry merges only recompute when the store changes.
  return useMemo(() => {
    const order = new Map(snapshot.followedUris.map((uri, i) => [uri, i]))
    const collections = [...snapshot.collections].sort(
      (a, b) => (order.get(a.uri) ?? 0) - (order.get(b.uri) ?? 0)
    )
    return { ...snapshot, collections }
  }, [snapshot])
}

/** Test seam: reset the module store between tests. */
export function resetFollowedCollectionsForTest(): void {
  state = null
  fetchStartedFor.clear()
}
