import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncStatus = 'idle' | 'pending' | 'error'

export interface AsyncTask<Args extends unknown[], T> {
  /** Where the task is in its lifecycle: never run / in flight / failed. */
  status: AsyncStatus
  /** The cause of the most recent failure, or null once a run starts. */
  error: Error | null
  /** Convenience mirror of `status === 'pending'` for render guards. */
  isPending: boolean
  /**
   * Start the task. Resolves with the task's value on success, or `undefined`
   * on failure — `run` never throws, so callers can `await` it without a
   * try/catch and read `status`/`error` for the outcome.
   */
  run: (...args: Args) => Promise<T | undefined>
}

/**
 * The single source of truth for "is this async work in flight?" — the state
 * machine every loading indicator reads from, so each surface stops
 * re-deriving idle/pending/error by hand.
 *
 * A loading state is inherently local: it belongs to the one task running, not
 * to a global store that would lie the moment two things load at once. So this
 * is a hook, instantiated once per surface, not a singleton.
 *
 * It guards the two races a hand-rolled flag forgets:
 *  - It never sets state after unmount (the component is gone; nothing to show).
 *  - Last call wins: if a slow earlier run settles after a newer one started,
 *    the stale result is dropped instead of overwriting the live status. This is
 *    the same cancelled-flag logic useEffectThumbnails grew on its own, lifted
 *    into one place.
 */
export function useAsyncStatus<Args extends unknown[], T>(
  task: (...args: Args) => Promise<T>
): AsyncTask<Args, T> {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  // The latest task closure, without making `run` change identity when the
  // caller passes a fresh inline function each render.
  const taskRef = useRef(task)
  taskRef.current = task

  // Alive-guard and run-token: the two refs that close the races above.
  const mounted = useRef(true)
  const runToken = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async (...args: Args): Promise<T | undefined> => {
    const token = ++runToken.current
    setStatus('pending')
    setError(null)
    try {
      const result = await taskRef.current(...args)
      // Only the live run, on a mounted component, may report success.
      if (mounted.current && token === runToken.current) {
        setStatus('idle')
      }
      return result
    } catch (err) {
      if (mounted.current && token === runToken.current) {
        setStatus('error')
        setError(err instanceof Error ? err : new Error(String(err)))
      }
      return undefined
    }
  }, [])

  return { status, error, isPending: status === 'pending', run }
}
