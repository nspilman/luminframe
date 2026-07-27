import { MacroDef, RecipeDefinition, RecipeStepDef } from '@/effects-contract'

/**
 * Look drafts: effect chains being composed in the browser, persisted
 * continuously to localStorage so nothing is ever lost to a reload or an
 * OAuth redirect — the effectDrafts idiom, for the recipe grammar. A draft
 * is a RecipeDefinition plus its slug (the record key it will publish under)
 * and a timestamp.
 *
 * Draft looks live under `lookdraft://<slug>` keys, beside published Looks'
 * `at://` URIs — a scheme of their own so the two sources can never collide
 * (and can never collide with the shader registry's draft:// GLSL drafts).
 */

export interface StoredLookDraft {
  slug: string
  name: string
  description?: string
  steps: RecipeStepDef[]
  macros?: MacroDef[]
  updatedAt: string
}

/** The definition this draft authors. */
export function defFromLookDraft(draft: StoredLookDraft): RecipeDefinition {
  return {
    name: draft.name,
    ...(draft.description ? { description: draft.description } : {}),
    steps: draft.steps,
    ...(draft.macros && draft.macros.length > 0 ? { macros: draft.macros } : {}),
  }
}

export function lookDraftKey(slug: string): string {
  return `lookdraft://${slug}`
}

export function parseLookDraftKey(key: string): string | null {
  return key.startsWith('lookdraft://') ? key.slice('lookdraft://'.length) : null
}

export const LOOK_STORAGE_KEY = 'luminframe.lookDrafts'
const VERSION = 1

/** Fired on every save/delete — the one signal look hooks listen for. */
export const LOOK_DRAFTS_CHANGED_EVENT = 'luminframe.lookDrafts.changed'

interface DraftsEnvelope {
  version: number
  drafts: StoredLookDraft[]
}

/**
 * Read all look drafts. A version mismatch discards the store rather than
 * rehydrating a shape this build no longer understands; malformed storage
 * reads as empty.
 */
export function loadLookDrafts(): StoredLookDraft[] {
  try {
    const raw = localStorage.getItem(LOOK_STORAGE_KEY)
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

function persist(drafts: StoredLookDraft[]): void {
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ version: VERSION, drafts }))
  } catch {
    // Quota or unavailability — the in-memory draft is still live; the next
    // successful save catches up.
  }
  window.dispatchEvent(new Event(LOOK_DRAFTS_CHANGED_EVENT))
}

/** Insert or replace the draft with this slug. */
export function saveLookDraft(draft: StoredLookDraft): void {
  const rest = loadLookDrafts().filter((d) => d.slug !== draft.slug)
  persist([draft, ...rest])
}

export function deleteLookDraft(slug: string): void {
  persist(loadLookDrafts().filter((d) => d.slug !== slug))
}
