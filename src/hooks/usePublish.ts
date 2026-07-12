import { useState, useCallback, RefObject } from 'react'
import { AtprotoSession } from './useAtprotoSession'
import { PublishPort } from '@/application/ports/PublishPort'
import { BlueskyPublishAdapter } from '@/infrastructure/adapters/BlueskyPublishAdapter'
import { GrainPublishAdapter } from '@/infrastructure/adapters/GrainPublishAdapter'
import { LuminframePublishAdapter } from '@/infrastructure/adapters/LuminframePublishAdapter'
import { exportCanvasForUpload } from '@/lib/exportCanvasForUpload'
import { isSessionExpiredError } from '@/infrastructure/atproto/authErrors'
import { PublishTarget, ShareTarget, toLuminframeUrl, publicUrlFor } from '@/lib/publishUrls'
import { StrongRef } from '@/types/atproto'
import { RecipeStep } from '@/types/recipe'

export type { PublishTarget, ShareTarget } from '@/lib/publishUrls'

export type PublishPhase = 'idle' | 'publishing' | 'success' | 'error'

/**
 * Where a single destination is in the save. `pending` is queued-but-not-started,
 * `active` is in flight — together they let the dialog show live progress rather
 * than one opaque spinner for the whole (slow) multi-target write.
 */
export type OutcomeStatus = 'pending' | 'active' | 'ok' | 'failed'

/** The live status of writing to one destination. */
export interface PublishOutcome {
  target: PublishTarget
  status: OutcomeStatus
  /** Web URL to the created record, once it succeeded. */
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

/** The edit being saved, beyond the pixels — recorded on the PDS record. */
export interface PublishEdit {
  /** Effect keys, in order — the lightweight recipe (display + backward compat). */
  effects: readonly string[]
  /** The executable effect stack with params (already serialized). */
  recipe?: readonly RecipeStep[]
  /** The parent record, when this edit descends from a remixed image. */
  remixOf?: StrongRef
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
  edit: PublishEdit = { effects: [] }
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

      // Patch one destination's row in place, so the dialog reflects each step
      // the moment it happens instead of only at the end.
      const patch = (target: PublishTarget, next: Partial<PublishOutcome>) =>
        setState((prev) => ({
          ...prev,
          outcomes: prev.outcomes.map((o) => (o.target === target ? { ...o, ...next } : o)),
        }))

      // Seed the live checklist: the save is up first (active), shares queued.
      setState({
        phase: 'publishing',
        outcomes: [
          { target: 'luminframe', status: 'active', url: null },
          ...shareTo.map((target): PublishOutcome => ({ target, status: 'pending', url: null })),
        ],
        error: null,
      })

      try {
        const { bytes, mimeType, aspectRatio } = await exportCanvasForUpload(canvas)
        const input = {
          bytes,
          mimeType,
          alt,
          caption,
          aspectRatio,
          effects: edit.effects,
          recipe: edit.recipe,
          remixOf: edit.remixOf,
        }

        // Primary: always save to the user's PDS. A failure here means nothing
        // was written — surface it and stop before attempting any share.
        const save = await new LuminframePublishAdapter(agent).publishImage(input)
        patch('luminframe', { status: 'ok', url: toLuminframeUrl(save.uri) })

        // Secondary: opt-in cross-posts, in parallel. Flip them all to active,
        // then let each update its own row as it settles — one failing never
        // fails another, nor the save.
        shareTo.forEach((target) => patch(target, { status: 'active' }))
        await Promise.all(
          shareTo.map(async (target) => {
            try {
              const res = await shareAdapterFor(target, agent).publishImage(input)
              patch(target, { status: 'ok', url: publicUrlFor(target, res.uri, session.handle) })
            } catch (err) {
              console.error(`Share to ${target} failed:`, err)
              patch(target, { status: 'failed', url: null })
            }
          })
        )

        setState((prev) => ({ ...prev, phase: 'success' }))
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
    [session.agent, session.handle, session.clearSession, canvasRef, edit]
  )

  const reset = useCallback(() => setState(IDLE), [])

  return { ...state, publish, reset }
}
