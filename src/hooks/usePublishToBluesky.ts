import { useState, useCallback, RefObject } from 'react'
import { AtprotoSession } from './useAtprotoSession'
import { BlueskyPublishAdapter } from '@/infrastructure/adapters/BlueskyPublishAdapter'
import { exportCanvasForUpload } from '@/lib/exportCanvasForUpload'
import { isSessionExpiredError } from '@/infrastructure/atproto/authErrors'

export type PublishPhase = 'idle' | 'publishing' | 'success' | 'error'

export interface PublishToBlueskyState {
  phase: PublishPhase
  /** A bsky.app URL to the created post, once published. */
  postUrl: string | null
  error: string | null
}

export interface PublishToBluesky extends PublishToBlueskyState {
  publish: (input: { alt: string; caption: string }) => Promise<void>
  reset: () => void
}

/** at://{did}/app.bsky.feed.post/{rkey} → https://bsky.app/profile/{actor}/post/{rkey} */
function toPostUrl(uri: string, actor: string | null): string | null {
  const rkey = uri.split('/').pop()
  if (!rkey) return null
  return `https://bsky.app/profile/${actor ?? uri.split('/')[2]}/post/${rkey}`
}

/**
 * Orchestrates publishing the current render to Bluesky: export the canvas to
 * uploadable bytes, then hand them to the Bluesky adapter with the user's
 * authenticated agent. Exposes a small phase machine so the dialog can show
 * progress, the resulting post link, or an error.
 */
export function usePublishToBluesky(
  session: AtprotoSession,
  canvasRef: RefObject<HTMLCanvasElement>
): PublishToBluesky {
  const [state, setState] = useState<PublishToBlueskyState>({
    phase: 'idle',
    postUrl: null,
    error: null,
  })

  const publish = useCallback(
    async ({ alt, caption }: { alt: string; caption: string }) => {
      const canvas = canvasRef.current
      if (!canvas) {
        setState({ phase: 'error', postUrl: null, error: 'No rendered image to publish.' })
        return
      }
      if (!session.agent) {
        setState({ phase: 'error', postUrl: null, error: 'Sign in to Bluesky first.' })
        return
      }

      setState({ phase: 'publishing', postUrl: null, error: null })
      try {
        const { bytes, mimeType, aspectRatio } = await exportCanvasForUpload(canvas)
        const adapter = new BlueskyPublishAdapter(session.agent)
        const result = await adapter.publishImage({ bytes, mimeType, alt, caption, aspectRatio })
        setState({
          phase: 'success',
          postUrl: toPostUrl(result.uri, session.handle),
          error: null,
        })
      } catch (err) {
        console.error('Publish to Bluesky failed:', err)
        // A dead session can only be discovered on a failed write (no
        // session-deleted event in this client). Drop it so the UI returns to
        // signed-out and the user can re-authenticate.
        if (isSessionExpiredError(err)) {
          session.clearSession()
          setState({
            phase: 'error',
            postUrl: null,
            error: 'Your Bluesky session expired. Please sign in again.',
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
