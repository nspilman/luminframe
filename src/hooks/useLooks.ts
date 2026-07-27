import { useCallback, useEffect, useMemo, useState } from 'react'
import { RecipeDefinition, parseRecipeRecord, buildRecipeRecord } from '@/effects-contract'
import { fetchRepoRecipeRecords, RawRecipeRecord } from '@/infrastructure/atproto/recipeRecords'
import {
  LOOK_DRAFTS_CHANGED_EVENT,
  StoredLookDraft,
  defFromLookDraft,
  loadLookDrafts,
  lookDraftKey,
} from '@/lib/lookDrafts'

/**
 * The user's Looks — published com.luminframe.recipe records plus local
 * drafts — made list-ready. Looks are not ShaderEffects and never enter the
 * effect registry; they carry their chain as data, hydrated at apply time.
 *
 * Every source passes through parseRecipeRecord: drafts are wrapped as
 * synthetic records (uri lookdraft://<slug>) so no source can bypass the
 * grammar. Whether each step's effect resolves is apply-time judgment (it
 * needs the loaded registry), not a load-time gate.
 */

export interface LookEntry {
  /** at://… for published Looks, lookdraft://<slug> for local drafts. */
  key: string
  def: RecipeDefinition
}

/** Raw records → list-ready entries, with named reasons for the refused. */
export function buildLookEntries(
  records: RawRecipeRecord[]
): { entries: LookEntry[]; skipped: Array<{ uri: string; reasons: string[] }> } {
  const entries: LookEntry[] = []
  const skipped: Array<{ uri: string; reasons: string[] }> = []
  for (const record of records) {
    const parsed = parseRecipeRecord(record.value)
    if (parsed.ok) entries.push({ key: record.uri, def: parsed.def })
    else skipped.push({ uri: record.uri, reasons: parsed.errors })
  }
  return { entries, skipped }
}

interface PublishedLooksState {
  status: 'idle' | 'loading' | 'loaded'
  entries: LookEntry[]
  skipped: Array<{ uri: string; reasons: string[] }>
}

const EMPTY: PublishedLooksState = { status: 'idle', entries: [], skipped: [] }

/** Local look drafts, re-read whenever the store announces a change. */
function useLookDrafts(): LookEntry[] {
  const [drafts, setDrafts] = useState<StoredLookDraft[]>(() => loadLookDrafts())

  useEffect(() => {
    const onChange = () => setDrafts(loadLookDrafts())
    window.addEventListener(LOOK_DRAFTS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(LOOK_DRAFTS_CHANGED_EVENT, onChange)
  }, [])

  return useMemo(() => {
    const { entries, skipped } = buildLookEntries(
      drafts.map((d) => ({ uri: lookDraftKey(d.slug), value: buildRecipeRecord(defFromLookDraft(d), d.updatedAt) }))
    )
    for (const skip of skipped) {
      console.warn(`Skipping stored look draft ${skip.uri}:`, skip.reasons)
    }
    return entries
  }, [drafts])
}

export interface LookLibrary {
  /** Drafts first (most recently touched leads), then published. */
  looks: LookEntry[]
  /** Published records the grammar refused — the author's fix list. */
  skipped: Array<{ uri: string; reasons: string[] }>
  refresh: () => void
  ready: boolean
}

/** All of one user's Looks: local drafts merged with their published records. */
export function useLookLibrary(did: string | null): LookLibrary {
  const drafts = useLookDrafts()
  const [published, setPublished] = useState<PublishedLooksState>(EMPTY)
  const [generation, setGeneration] = useState(0)
  const refresh = useCallback(() => setGeneration((g) => g + 1), [])

  useEffect(() => {
    if (!did) {
      setPublished(EMPTY)
      return
    }
    let active = true
    setPublished({ status: 'loading', entries: [], skipped: [] })
    fetchRepoRecipeRecords(did).then((records) => {
      if (!active) return
      const { entries, skipped } = buildLookEntries(records)
      for (const skip of skipped) {
        console.warn(`Skipping recipe record ${skip.uri}:`, skip.reasons)
      }
      setPublished({ status: 'loaded', entries, skipped })
    })
    return () => {
      active = false
    }
  }, [did, generation])

  return useMemo(
    () => ({
      looks: [...drafts, ...published.entries],
      skipped: published.skipped,
      refresh,
      ready: published.status !== 'loading',
    }),
    [drafts, published, refresh]
  )
}
