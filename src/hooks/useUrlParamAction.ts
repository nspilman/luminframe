import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Honors a one-shot URL query param: resolve it to some data, commit that data,
 * then remove the param. This is the shape the editor's transient addresses share
 * — ?remix=<at-uri> and ?recipe=<at-uri>. Each is an *instruction*, not a place:
 * once carried out it is deleted with { replace: true }, so a reload or Back won't
 * re-fire it and a shared link never keeps a spent instruction in its meaning.
 *
 * The two phases are separate on purpose. `resolve` is the async fetch/transform;
 * `commit` is the synchronous mutation of app state. The seam between them is where
 * "is this still the current param?" must be checked: if the param changed (or the
 * host unmounted) while `resolve` was in flight, the stale result is dropped before
 * it can touch state — so a rapid second remix can't be overwritten by the first
 * one resolving late. Callbacks are held in refs so the effect depends only on the
 * param's value: it fires once per distinct value, not on every render.
 */
export function useUrlParamAction<T>(
  param: string,
  resolve: (value: string) => Promise<T>,
  commit: (resolved: T) => void
): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(param)

  const resolveRef = useRef(resolve)
  resolveRef.current = resolve
  const commitRef = useRef(commit)
  commitRef.current = commit

  useEffect(() => {
    if (!value) return
    let active = true

    ;(async () => {
      const resolved = await resolveRef.current(value)
      if (!active) return
      commitRef.current(resolved)
      setSearchParams(
        (prev) => {
          prev.delete(param)
          return prev
        },
        { replace: true }
      )
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}
