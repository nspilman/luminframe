import { useEffect, useState } from 'react'

/** A public appview — actor typeahead is an unauthenticated read, so it works signed-out. */
const APPVIEW = 'https://public.api.bsky.app'

export interface ActorSuggestion {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

/**
 * The query to send for a raw handle input, or null when it's too short to be
 * worth a lookup. Strips a leading @ (people type it out of habit) and trims;
 * needs 2+ characters so a single keystroke doesn't fire a search.
 */
export function normalizeHandleQuery(raw: string): string | null {
  const q = raw.trim().replace(/^@+/, '')
  return q.length >= 2 ? q : null
}

/**
 * Handle autocomplete for the sign-in field, the common Atmosphere convention:
 * as you type, suggest matching accounts from the network's actor typeahead
 * (app.bsky.actor.searchActorsTypeahead). The lookup is debounced so it fires on
 * a pause, not every keystroke, and a stale response is dropped if the query moved
 * on. Failures resolve to no suggestions — a flaky lookup shouldn't block sign-in.
 */
export function useHandleTypeahead(query: string, limit = 6): { suggestions: ActorSuggestion[]; loading: boolean } {
  const [suggestions, setSuggestions] = useState<ActorSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = normalizeHandleQuery(query)
    if (!q) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, limit: String(limit) })
        const res = await fetch(`${APPVIEW}/xrpc/app.bsky.actor.searchActorsTypeahead?${params}`)
        if (!res.ok) throw new Error(`typeahead ${res.status}`)
        const data = await res.json()
        if (!active) return
        const actors: ActorSuggestion[] = Array.isArray(data.actors)
          ? data.actors.map((a: ActorSuggestion) => ({
              did: a.did,
              handle: a.handle,
              displayName: a.displayName,
              avatar: a.avatar,
            }))
          : []
        setSuggestions(actors)
      } catch {
        if (active) setSuggestions([])
      } finally {
        if (active) setLoading(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, limit])

  return { suggestions, loading }
}
