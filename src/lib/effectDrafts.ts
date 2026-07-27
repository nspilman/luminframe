import { EffectDefinition, EffectParamDef, ENV_VERSION } from '@/effects-contract'
import { EffectKey } from '@/types/shader'

/**
 * The Effect Creator's drafts: shader effects being authored in the browser,
 * persisted continuously to localStorage so nothing is ever lost to a reload
 * or an OAuth redirect. A draft is an EffectDefinition plus its slug (the
 * record key it will publish under) and a timestamp — deliberately NOT the
 * env version, which is stamped fresh by defFromDraft so a draft can never
 * carry a stale environment claim.
 *
 * Drafts live in the editor's registry under `draft://<slug>` keys — a third
 * scheme beside the effects/ directory's `local://` and published `at://`,
 * so the three sources can never collide.
 */

export interface StoredDraft {
  slug: string
  name: string
  description?: string
  params: EffectParamDef[]
  body: string
  animatedBy?: string
  /**
   * The Blocks term JSON this draft was built from. Present ⇒ the Blocks
   * room owns it (body and params are compiled); editing the body in the
   * GLSL room detaches the blocks by clearing this.
   */
  source?: string
  updatedAt: string
}

/** The definition this draft authors, stamped with the current env version. */
export function defFromDraft(draft: StoredDraft): EffectDefinition {
  return {
    name: draft.name,
    ...(draft.description ? { description: draft.description } : {}),
    env: ENV_VERSION,
    params: draft.params,
    body: draft.body,
    ...(draft.animatedBy ? { animatedBy: draft.animatedBy } : {}),
    ...(draft.source ? { source: draft.source } : {}),
  }
}

export function draftKey(slug: string): EffectKey {
  return `draft://${slug}`
}

export function parseDraftKey(key: EffectKey): string | null {
  return key.startsWith('draft://') ? key.slice('draft://'.length) : null
}

export const STORAGE_KEY = 'luminframe.effectDrafts'
const VERSION = 1

/** Fired on every save/delete — the one signal registry hooks listen for. */
export const DRAFTS_CHANGED_EVENT = 'luminframe.effectDrafts.changed'

interface DraftsEnvelope {
  version: number
  drafts: StoredDraft[]
}

/**
 * Read all drafts. A version mismatch discards the store rather than
 * rehydrating a shape this build no longer understands (the editorSession
 * precedent); malformed storage reads as empty.
 */
export function loadDrafts(): StoredDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as DraftsEnvelope).version !== VERSION ||
      !Array.isArray((parsed as DraftsEnvelope).drafts)
    ) {
      return []
    }
    return (parsed as DraftsEnvelope).drafts
  } catch {
    return []
  }
}

function persist(drafts: StoredDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, drafts }))
  } catch {
    // Quota or unavailability — the in-memory draft is still live; the next
    // successful save catches up.
  }
  window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT))
}

/** Insert or replace the draft with this slug. */
export function saveDraft(draft: StoredDraft): void {
  const rest = loadDrafts().filter((d) => d.slug !== draft.slug)
  persist([draft, ...rest])
}

export function deleteDraft(slug: string): void {
  persist(loadDrafts().filter((d) => d.slug !== slug))
}
