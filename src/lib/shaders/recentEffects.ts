import { EffectKey, registeredShaders } from '@/types/shader'

/**
 * The effects a person has recently used, most-recent first, persisted across
 * sessions. Recents serve the *returning* user: the look you reached for
 * yesterday is one click away today, without searching or scrolling — pure
 * recognition over recall.
 *
 * "Used" means committed to — applied to the stack or downloaded — not merely
 * hovered or selected while browsing, so the list stays a record of intent
 * rather than a trail of everything the pointer passed over.
 */

export const STORAGE_KEY = 'luminframe.recentEffects'
export const RECENTS_MAX = 6

/**
 * Put `type` at the front, remove any earlier occurrence, cap the length.
 * Re-using an effect promotes it back to most-recent rather than duplicating it.
 */
export function pushRecent(recents: EffectKey[], type: EffectKey, max = RECENTS_MAX): EffectKey[] {
  return [type, ...recents.filter((t) => t !== type)].slice(0, max)
}

/**
 * A key that could name an effect: a builtin, or the AT-URI of a custom effect
 * record. Deliberately syntactic — custom effects load asynchronously, so
 * membership can't be checked here at storage-load time. An at:// key that no
 * longer resolves survives the load and is dropped where keys are resolved
 * (the picker), not destroyed here.
 */
const isPlausibleEffectKey = (value: unknown): value is EffectKey =>
  typeof value === 'string' &&
  ((registeredShaders as readonly string[]).includes(value) || value.startsWith('at://'))

/**
 * Read the persisted recents, dropping anything that couldn't name an effect.
 * The store is untrusted across versions — a builtin can be renamed or removed
 * between visits — so a stale builtin key must never reach the library.
 */
export function loadRecents(): EffectKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isPlausibleEffectKey).slice(0, RECENTS_MAX) : []
  } catch {
    return []
  }
}

export function saveRecents(recents: EffectKey[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents))
  } catch {
    // Storage can be unavailable or full; recents are a convenience, not load-bearing.
  }
}
