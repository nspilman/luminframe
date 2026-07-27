import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildEffectRecord } from '@/effects-contract'
import { DRAFTS_CHANGED_EVENT, defFromDraft, draftKey, loadDrafts, StoredDraft } from '@/lib/effectDrafts'
import { CustomEffectEntry, buildCustomEffectEntries } from './useCustomEffects'

/**
 * The creator's saved drafts, made editor-ready. Each draft is wrapped as a
 * synthetic record (uri draft://<slug>) and passed through the identical
 * validate → hydrate → compile pipeline network records take, so a draft can
 * never bypass the grammar on its way into the registry. Skips warn to the
 * console — the creator only saves drafts that validate, so a skip here means
 * version drift, not authoring.
 *
 * Re-reads whenever the store announces a change (DRAFTS_CHANGED_EVENT) —
 * the one signal, fired by saveDraft/deleteDraft.
 */
export function useDraftEffects(): CustomEffectEntry[] {
  const [drafts, setDrafts] = useState<StoredDraft[]>(() => loadDrafts())

  useEffect(() => {
    const onChange = () => setDrafts(loadDrafts())
    window.addEventListener(DRAFTS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(DRAFTS_CHANGED_EVENT, onChange)
  }, [])

  const toRecord = useCallback(
    (d: StoredDraft) => ({ uri: draftKey(d.slug), value: buildEffectRecord(defFromDraft(d), d.updatedAt) }),
    []
  )

  return useMemo(() => {
    const { entries, skipped } = buildCustomEffectEntries(drafts.map(toRecord))
    for (const skip of skipped) {
      console.warn(`Skipping stored draft ${skip.uri}:`, skip.reasons)
    }
    return entries
  }, [drafts, toRecord])
}
