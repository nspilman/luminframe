import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { LUMINFRAME_DID } from '@/effects-contract'
import { fetchFeaturedEffectRecords, RawEffectRecord } from '@/infrastructure/atproto/effectRecords'
import { slugForEffectKey } from '@/lib/shaders/toEffectDefinition'
import { registeredShaders, ShaderType } from '@/types/shader'
import { buildCustomEffectEntries, CustomEffectEntry } from './useCustomEffects'

/**
 * The official effect library, loaded from canon — the effects the featured
 * collection (luminframe.com's com.luminframe.collection/featured record)
 * points at. The records are the source of truth (data lives in repos; the
 * app is a view), and membership is curation, not authorship: the collection
 * may list any author's effect. Until that record exists, the fetch falls
 * back to luminframe.com's own repo.
 *
 * A module-level store rather than per-hook state because more than one
 * surface needs the library (the editor's registry, the gallery's effect
 * names) and the fetch must happen once per page load, not once per mount.
 *
 * Entries authored by luminframe.com are re-keyed from their at:// URIs to
 * the short builtin keys (pixelate, blackAndWhite, …) because those keys are
 * the recipe wire format — every published image names its steps with them,
 * and they must resolve forever. Everything else — a community effect the
 * collection features, or a canon record whose slug postdates this build —
 * joins under its at:// URI, which is already how recipes name it.
 *
 * Snapshot cache: the last good fetch is kept in localStorage and served
 * immediately on the next visit (stale-while-revalidate), so reloads are
 * instant and the editor works offline after the first visit. Only the very
 * first visit ever waits on the network.
 */

export const OFFICIAL_SNAPSHOT_KEY = 'luminframe.officialEffects'

export interface OfficialEffectsState {
  /** idle → snapshot (serving the cached copy) → loaded; 'failed' only with no snapshot to fall back on. */
  status: 'idle' | 'snapshot' | 'loaded' | 'failed'
  entries: CustomEffectEntry[]
}

/** slug → short key, over the known key list (the inverse of slugForEffectKey). */
const keyBySlug = new Map<string, ShaderType>(
  registeredShaders.map((key) => [slugForEffectKey(key), key])
)

/**
 * Re-key canon entries to the recipe wire format where the slug is known.
 * Only luminframe.com's own records qualify — a featured community effect
 * whose rkey happens to match a builtin slug is a different effect and keeps
 * its at:// key.
 */
export function rekeyOfficialEntries(entries: CustomEffectEntry[]): CustomEffectEntry[] {
  return entries.map((entry) => {
    if (!entry.key.startsWith(`at://${LUMINFRAME_DID}/`)) return entry
    const slug = entry.key.split('/').pop() ?? ''
    const short = keyBySlug.get(slug)
    return short ? { ...entry, key: short } : entry
  })
}

function readSnapshot(): RawEffectRecord[] | null {
  try {
    const raw = localStorage.getItem(OFFICIAL_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { records?: RawEffectRecord[] }
    return Array.isArray(parsed.records) ? parsed.records : null
  } catch {
    return null
  }
}

function writeSnapshot(records: RawEffectRecord[]): void {
  try {
    localStorage.setItem(OFFICIAL_SNAPSHOT_KEY, JSON.stringify({ records }))
  } catch {
    // A full or unavailable localStorage costs the next visit a fetch, nothing more.
  }
}

let state: OfficialEffectsState | null = null
let fetchStarted = false
const listeners = new Set<() => void>()

function setState(next: OfficialEffectsState): void {
  state = next
  for (const listener of listeners) listener()
}

function getState(): OfficialEffectsState {
  if (state === null) {
    const snapshot = readSnapshot()
    state = snapshot
      ? { status: 'snapshot', entries: rekeyOfficialEntries(buildCustomEffectEntries(snapshot).entries) }
      : { status: 'idle', entries: [] }
  }
  return state
}

function ensureFetched(): void {
  if (fetchStarted) return
  fetchStarted = true
  fetchFeaturedEffectRecords()
    .then((records) => {
      writeSnapshot(records)
      setState({ status: 'loaded', entries: rekeyOfficialEntries(buildCustomEffectEntries(records).entries) })
    })
    .catch(() => {
      // Offline or canon unreachable: the snapshot (already showing) is the
      // working library. 'failed' is only the no-snapshot first visit.
      const current = getState()
      if (current.status !== 'snapshot') setState({ status: 'failed', entries: [] })
    })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOfficialEffects(): OfficialEffectsState {
  const snapshot = useSyncExternalStore(subscribe, getState)
  useEffect(ensureFetched, [])
  return snapshot
}

/** Display names by effect key — the gallery's projection of the library. */
export function useOfficialEffectNames(): Record<string, string> {
  const { entries } = useOfficialEffects()
  return useMemo(
    () => Object.fromEntries(entries.map((e) => [e.key, e.effect.name])),
    [entries]
  )
}
