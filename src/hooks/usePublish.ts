import { useState, useCallback, RefObject } from 'react'
import { AtprotoSession } from './useAtprotoSession'
import { PublishPort } from '@/application/ports/PublishPort'
import { BlueskyPublishAdapter } from '@/infrastructure/adapters/BlueskyPublishAdapter'
import { GrainPublishAdapter } from '@/infrastructure/adapters/GrainPublishAdapter'
import { LuminframePublishAdapter } from '@/infrastructure/adapters/LuminframePublishAdapter'
import { exportCanvasForUpload } from '@/lib/exportCanvasForUpload'
import { isSessionExpiredError } from '@/infrastructure/atproto/authErrors'
import { PublishTarget, ShareTarget, toLuminframeUrl, publicUrlFor } from '@/lib/publishUrls'

export type { PublishTarget, ShareTarget } from '@/lib/publishUrls'

export type PublishPhase = 'idle' | 'publishing' | 'success' | 'error'

/** The result of writing to one destination. */
export interface PublishOutcome {
  target: PublishTarget
  status: 'ok' | 'failed'
  /** Web URL to the created record, when it succeeded. */
  url: string | null
}

export interface PublishState {
  phase: PublishPhase
  /**
   * Per-destination results, canonical PDS save first. Populated on success
   * (the save, plus any selected shares — each of which may have failed on its
   * own without failing the save).
   */
  outcomes: PublishOutcome[]
  /** Set only when the canonical save itself failed — nothing was written. */
  error: string | null
}

export interface PublishInput {
  alt: string
  caption: string
  /** Optional cross-posts to make alongside the always-on PDS save. */
  shareTo: ShareTarget[]
}

export interface Publisher extends PublishState {
  publish: (input: PublishInput) => Promise<void>
  reset: () => void
}

const IDLE: PublishState = { phase: 'idle', outcomes: [], error: null }

/** The adapter that cross-posts to a given social network. */
function shareAdapterFor(
  target: ShareTarget,
  agent: NonNullable<AtprotoSession['agent']>
): PublishPort {
  return target === 'grain' ? new GrainPublishAdapter(agent) : new BlueskyPublishAdapter(agent)
}

/**
 * Orchestrates saving the current render. Every save writes the canonical
 * `com.luminframe.image` record to the user's PDS; Bluesky and Grain are opt-in
 * cross-posts made alongside it.
 *
 * The save is primary: if it fails, nothing was written and the phase is `error`.
 * The shares are secondary and best-effort — they run in parallel after the save
 * and each reports its own outcome, so a failed cross-post never loses the save.
 *
 * The canvas is exported once; every destination uploads those same bytes, which
 * (being content-addressed) the PDS stores as a single blob regardless.
 */
export function usePublish(
  session: AtprotoSession,
  canvasRef: RefObject<HTMLCanvasElement>,
  effects: readonly string[] = []
): Publisher {
  const [state, setState] = useState<PublishState>(IDLE)

  const publish = useCallback(
    async ({ alt, caption, shareTo }: PublishInput) => {
      const canvas = canvasRef.current
      if (!canvas) {
        setState({ phase: 'error', outcomes: [], error: 'No rendered image to save.' })
        return
      }
      if (!session.agent) {
        setState({ phase: 'error', outcomes: [], error: 'Sign in first.' })
        return
      }
      const agent = session.agent

      setState({ phase: 'publishing', outcomes: [], error: null })
      try {
        const { bytes, mimeType, aspectRatio } = await exportCanvasForUpload(canvas)
        const input = { bytes, mimeType, alt, caption, aspectRatio, effects }

        // Primary: always save to the user's PDS. A failure here means nothing
        // was written — surface it and stop before attempting any share.
        const save = await new LuminframePublishAdapter(agent).publishImage(input)
        const outcomes: PublishOutcome[] = [
          { target: 'luminframe', status: 'ok', url: toLuminframeUrl(save.uri) },
        ]

        // Secondary: opt-in cross-posts, in parallel, each independently fallible.
        const shares = await Promise.allSettled(
          shareTo.map((target) => shareAdapterFor(target, agent).publishImage(input))
        )
        shares.forEach((result, i) => {
          const target = shareTo[i]
          if (result.status === 'fulfilled') {
            outcomes.push({
              target,
              status: 'ok',
              url: publicUrlFor(target, result.value.uri, session.handle),
            })
          } else {
            console.error(`Share to ${target} failed:`, result.reason)
            outcomes.push({ target, status: 'failed', url: null })
          }
        })

        setState({ phase: 'success', outcomes, error: null })
      } catch (err) {
        console.error('Save failed:', err)
        // A dead session can only be discovered on a failed write (no
        // session-deleted event in this client). Drop it so the UI returns to
        // signed-out and the user can re-authenticate.
        if (isSessionExpiredError(err)) {
          session.clearSession()
          setState({
            phase: 'error',
            outcomes: [],
            error: 'Your session expired. Please sign in again.',
          })
          return
        }
        setState({
          phase: 'error',
          outcomes: [],
          error: 'Saving failed. Please try again.',
        })
      }
    },
    [session.agent, session.handle, session.clearSession, canvasRef, effects]
  )

  const reset = useCallback(() => setState(IDLE), [])

  return { ...state, publish, reset }
}
