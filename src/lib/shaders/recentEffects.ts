import { ShaderType, registeredShaders } from '@/types/shader'

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
export function pushRecent(recents: ShaderType[], type: ShaderType, max = RECENTS_MAX): ShaderType[] {
  return [type, ...recents.filter((t) => t !== type)].slice(0, max)
}

const isShaderType = (value: unknown): value is ShaderType =>
  typeof value === 'string' && (registeredShaders as readonly string[]).includes(value)

/**
 * Read the persisted recents, dropping anything that isn't a currently-known
 * effect. The store is untrusted across versions — an effect can be renamed or
 * removed between visits — so a stale key must never reach `shaderLibrary`.
 */
export function loadRecents(): ShaderType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isShaderType).slice(0, RECENTS_MAX) : []
  } catch {
    return []
  }
}

export function saveRecents(recents: ShaderType[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents))
  } catch {
    // Storage can be unavailable or full; recents are a convenience, not load-bearing.
  }
}
