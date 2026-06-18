import { useState, useCallback, RefObject } from 'react'
import { AtprotoSession } from './useAtprotoSession'
import { PublishPort } from '@/application/ports/PublishPort'
import { BlueskyPublishAdapter } from '@/infrastructure/adapters/BlueskyPublishAdapter'
import { GrainPublishAdapter } from '@/infrastructure/adapters/GrainPublishAdapter'
import { exportCanvasForUpload } from '@/lib/exportCanvasForUpload'
import { isSessionExpiredError } from '@/infrastructure/atproto/authErrors'

/** The networks an image can be published to, both over the same AT identity. */
export type PublishTarget = 'bluesky' | 'grain'

export type PublishPhase = 'idle' | 'publishing' | 'success' | 'error'

export interface PublishState {
  phase: PublishPhase
  /** A web URL to the created post/gallery, once published. */
  postUrl: string | null
  error: string | null
}

export interface PublishInput {
  alt: string
  caption: string
  target: PublishTarget
}

export interface Publisher extends PublishState {
  publish: (input: PublishInput) => Promise<void>
  reset: () => void
}

/** at://{did}/app.bsky.feed.post/{rkey} → https://bsky.app/profile/{actor}/post/{rkey} */
function toBlueskyUrl(uri: string, actor: string | null): string | null {
  const rkey = uri.split('/').pop()
  if (!rkey) return null
  return `https://bsky.app/profile/${actor ?? uri.split('/')[2]}/post/${rkey}`
}

/**
 * at://{did}/social.grain.gallery/{rkey} → https://grain.social/profile/{did}/gallery/{rkey}
 * Grain's gallery route takes the DID directly, so no handle lookup is needed.
 */
function toGrainUrl(uri: string): string | null {
  const parts = uri.split('/')
  const did = parts[2]
  const rkey = parts[parts.length - 1]
  if (!did || !rkey) return null
  return `https://grain.social/profile/${did}/gallery/${rkey}`
}

function adapterFor(target: PublishTarget, agent: NonNullable<AtprotoSession['agent']>): PublishPort {
  return target === 'grain'
    ? new GrainPublishAdapter(agent)
    : new BlueskyPublishAdapter(agent)
}

/**
 * Orchestrates publishing the current render to a chosen AT Protocol target:
 * export the canvas to uploadable bytes, then hand them to that target's adapter
 * with the user's authenticated agent. Exposes a small phase machine so the
 * dialog can show progress, the resulting link, or an error.
 *
 * The target picks the adapter (which records get written) and how the result
 * AT-URI maps to a human web URL — everything else is shared.
 */
export function usePublish(
  session: AtprotoSession,
  canvasRef: RefObject<HTMLCanvasElement>
): Publisher {
  const [state, setState] = useState<PublishState>({
    phase: 'idle',
    postUrl: null,
    error: null,
  })

  const publish = useCallback(
    async ({ alt, caption, target }: PublishInput) => {
      const canvas = canvasRef.current
      if (!canvas) {
        setState({ phase: 'error', postUrl: null, error: 'No rendered image to publish.' })
        return
      }
      if (!session.agent) {
        setState({ phase: 'error', postUrl: null, error: 'Sign in first.' })
        return
      }

      setState({ phase: 'publishing', postUrl: null, error: null })
      try {
        const { bytes, mimeType, aspectRatio } = await exportCanvasForUpload(canvas)
        const adapter = adapterFor(target, session.agent)
        const result = await adapter.publishImage({ bytes, mimeType, alt, caption, aspectRatio })
        const postUrl =
          target === 'grain' ? toGrainUrl(result.uri) : toBlueskyUrl(result.uri, session.handle)
        setState({ phase: 'success', postUrl, error: null })
      } catch (err) {
        console.error('Publish failed:', err)
        // A dead session can only be discovered on a failed write (no
        // session-deleted event in this client). Drop it so the UI returns to
        // signed-out and the user can re-authenticate.
        if (isSessionExpiredError(err)) {
          session.clearSession()
          setState({
            phase: 'error',
            postUrl: null,
            error: 'Your session expired. Please sign in again.',
          })
          return
        }
        setState({
          phase: 'error',
          postUrl: null,
          error: 'Publishing failed. Please try again.',
        })
      }
    },
    [session.agent, session.handle, session.clearSession, canvasRef]
  )

  const reset = useCallback(
    () => setState({ phase: 'idle', postUrl: null, error: null }),
    []
  )

  return { ...state, publish, reset }
}
