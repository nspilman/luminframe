import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { PublishPhase } from '@/hooks/usePublishToBluesky'

interface PublishToBlueskyDialogProps {
  open: boolean
  onClose: () => void
  isSignedIn: boolean
  phase: PublishPhase
  postUrl: string | null
  error: string | null
  onPublish: (input: { alt: string; caption: string }) => void
}

/**
 * Modal for publishing the current render to Bluesky. Collects an alt
 * description (required for accessibility) and an optional caption, then
 * reflects the publish phase: a spinner while in flight, a link to the live
 * post on success, an inline error on failure.
 */
export function PublishToBlueskyDialog({
  open,
  onClose,
  isSignedIn,
  phase,
  postUrl,
  error,
  onPublish,
}: PublishToBlueskyDialogProps) {
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')

  if (!open) return null

  const publishing = phase === 'publishing'
  const succeeded = phase === 'success'

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[26rem] max-w-[90%] rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-white">Publish to Bluesky</h2>

        {!isSignedIn ? (
          <p className="text-sm text-zinc-400">
            Sign in with Bluesky (top right) to publish your image.
          </p>
        ) : succeeded ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Posted to Bluesky.</p>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-sm text-violet-400 hover:text-violet-300"
              >
                View your post ↗
              </a>
            )}
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="bsky-alt" className="mb-1 block text-xs text-zinc-400">
                Alt text (image description)
              </label>
              <Input
                id="bsky-alt"
                autoFocus
                placeholder="Describe the image"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                disabled={publishing}
              />
            </div>
            <div>
              <label htmlFor="bsky-caption" className="mb-1 block text-xs text-zinc-400">
                Caption (optional)
              </label>
              <textarea
                id="bsky-caption"
                rows={3}
                placeholder="Say something about it…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={publishing}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={publishing}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-violet-600 text-white hover:bg-violet-500"
                disabled={publishing || !alt.trim()}
                onClick={() => onPublish({ alt: alt.trim(), caption: caption.trim() })}
              >
                {publishing ? <Spinner size="sm" /> : 'Publish'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
