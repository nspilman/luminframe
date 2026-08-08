import { useEffect, useState } from 'react'
import { LUMINFRAME_DID } from '@/effects-contract'
import { fetchRepoEffectRecords, RawEffectRecord } from '@/infrastructure/atproto/effectRecords'
import { slugForEffectKey } from '@/lib/shaders/toEffectDefinition'
import { registeredShaders, ShaderType } from '@/types/shader'
import { buildCustomEffectEntries, CustomEffectEntry } from './useCustomEffects'

/**
 * The official effect library, loaded from canon — the com.luminframe.effect
 * records in luminframe.com's repo. The records are the source of truth (data
 * lives in repos; the app is a view); this hook is the app-side of that
 * inversion.
 *
 * Entries are re-keyed from their at:// URIs to the short builtin keys
 * (pixelate, blackAndWhite, …) because those keys are the recipe wire format
 * — every published image names its steps with them, and they must resolve
 * forever. A canon record whose slug matches no known key joins under its
 * at:// URI: an effect that postdates this build, present but uncurated.
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

/** Re-key canon entries to the recipe wire format where the slug is known. */
export function rekeyOfficialEntries(entries: CustomEffectEntry[]): CustomEffectEntry[] {
  return entries.map((entry) => {
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

export function useOfficialEffects(): OfficialEffectsState {
  const [state, setState] = useState<OfficialEffectsState>(() => {
    const snapshot = readSnapshot()
    if (!snapshot) return { status: 'idle', entries: [] }
    return { status: 'snapshot', entries: rekeyOfficialEntries(buildCustomEffectEntries(snapshot).entries) }
  })

  useEffect(() => {
    let active = true
    fetchRepoEffectRecords(LUMINFRAME_DID)
      .then((records) => {
        if (!active) return
        writeSnapshot(records)
        setState({ status: 'loaded', entries: rekeyOfficialEntries(buildCustomEffectEntries(records).entries) })
      })
      .catch(() => {
        if (!active) return
        // Offline or canon unreachable: the snapshot (already showing) is the
        // working library. 'failed' is only the no-snapshot first visit.
        setState((prev) => (prev.status === 'snapshot' ? prev : { status: 'failed', entries: [] }))
      })
    return () => {
      active = false
    }
  }, [])

  return state
}
