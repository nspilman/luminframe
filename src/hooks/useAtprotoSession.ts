import { useState, useEffect, useCallback, useRef } from 'react'
import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { getOAuthClient, initOAuth } from '@/infrastructure/atproto/oauthClient'

export type AtprotoAuthStatus = 'initializing' | 'signed-out' | 'signed-in'

export interface AtprotoSession {
  status: AtprotoAuthStatus
  /** An authenticated agent, ready to write to the user's repo. Null unless signed in. */
  agent: Agent | null
  did: string | null
  /** The user's handle, resolved for display. May briefly lag `did` after sign-in. */
  handle: string | null
  error: string | null
  /** Begin the OAuth flow for a handle/DID/PDS. Navigates away; only settles on cancel. */
  signIn: (handle: string) => Promise<void>
  signOut: () => Promise<void>
  /**
   * Drop the local session without a network revoke — for when we've already
   * learned the session is dead (e.g. a write failed with an auth error).
   */
  clearSession: () => void
}

/**
 * Owns the app's Bluesky OAuth session: restores it on load, exposes an
 * authenticated `Agent` for writes, and surfaces sign-in / sign-out. Intended
 * to be used once near the top of the tree and threaded down (or lifted into
 * context) — it drives the one-time `initOAuth()` call.
 */
export function useAtprotoSession(): AtprotoSession {
  const [status, setStatus] = useState<AtprotoAuthStatus>('initializing')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [did, setDid] = useState<string | null>(null)
  const [handle, setHandle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<OAuthSession | null>(null)

  const adopt = useCallback(async (session: OAuthSession) => {
    sessionRef.current = session
    const nextAgent = new Agent(session)
    setAgent(nextAgent)
    setDid(session.did)
    setStatus('signed-in')
    try {
      const profile = await nextAgent.getProfile({ actor: session.did })
      setHandle(profile.data.handle)
    } catch {
      // The handle is cosmetic; a failed profile fetch must not drop the session.
    }
  }, [])

  const reset = useCallback(() => {
    sessionRef.current = null
    setAgent(null)
    setDid(null)
    setHandle(null)
    setStatus('signed-out')
  }, [])

  useEffect(() => {
    let active = true
    // Runs once: consumes an OAuth redirect if we're returning from the auth
    // server, otherwise restores the last active session. A session that later
    // expires or is revoked surfaces as a failed write — handled at publish time
    // rather than via a reactive listener (not in this client version's API).
    initOAuth()
      .then(async (result) => {
        if (!active) return
        if (result?.session) await adopt(result.session)
        else setStatus('signed-out')
      })
      .catch((err) => {
        // On a `localhost` origin the client throws while it redirects the page
        // to the required loopback IP (`127.0.0.1`). That's a navigation in
        // progress, not a failure — the page is unloading, so stay quiet and
        // leave the status as-is rather than flashing an error.
        if (String(err?.message ?? err).includes('Redirecting to loopback')) return
        console.error('Failed to initialize atproto OAuth client:', err)
        if (active) {
          setError('Could not start Bluesky sign-in.')
          setStatus('signed-out')
        }
      })

    return () => {
      active = false
    }
  }, [adopt])

  const signIn = useCallback(async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    setError(null)
    try {
      const client = await getOAuthClient()
      // Redirects the browser to the auth server; the returned promise only
      // settles if the user cancels (it never resolves on a successful redirect).
      await client.signIn(trimmed)
    } catch (err) {
      console.error('Bluesky sign-in failed:', err)
      setError('Sign-in failed. Check the handle and try again.')
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await sessionRef.current?.signOut()
    } catch (err) {
      console.error('Bluesky sign-out failed:', err)
    }
    reset()
  }, [reset])

  return { status, agent, did, handle, error, signIn, signOut, clearSession: reset }
}
