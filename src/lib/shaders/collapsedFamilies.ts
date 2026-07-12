/**
 * Which effect-family sections the user has collapsed in the picker, remembered
 * across visits. Storing the *collapsed* ids (not the open ones) means the
 * default is open and any family added later starts open too — the tidy-up is
 * opt-in, and discovery of new families is never silently hidden.
 */

export const STORAGE_KEY = 'luminframe.collapsedFamilies'

/** Toggle a family id in the collapsed set. */
export function toggleCollapsed(collapsed: string[], id: string): string[] {
  return collapsed.includes(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id]
}

export function loadCollapsed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveCollapsed(collapsed: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
  } catch {
    // Storage may be unavailable; a remembered layout is a convenience, not load-bearing.
  }
}
