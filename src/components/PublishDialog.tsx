import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { PublishPhase, PublishTarget } from '@/hooks/usePublish'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  isSignedIn: boolean
  phase: PublishPhase
  postUrl: string | null
  error: string | null
  onPublish: (input: { alt: string; caption: string; target: PublishTarget }) => void
}

const TARGETS: { value: PublishTarget; label: string }[] = [
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'grain', label: 'Grain' },
  { value: 'luminframe', label: 'My PDS' },
]

/** Per-target wording: what the published thing is called, and where it lands. */
const TARGET_COPY: Record<PublishTarget, { noun: string; done: string }> = {
  bluesky: { noun: 'post', done: 'Posted to Bluesky.' },
  grain: { noun: 'gallery', done: 'Published to Grain.' },
  luminframe: { noun: 'record', done: 'Saved to your PDS as a Luminframe record.' },
}

/**
 * Modal for publishing the current render to an AT Protocol target. Collects the
 * destination (Bluesky or Grain), an alt description (required for
 * accessibility), and an optional caption, then reflects the publish phase: a
 * spinner while in flight, a link to the live result on success, an inline error
 * on failure.
 */
export function PublishDialog({
  open,
  onClose,
  isSignedIn,
  phase,
  postUrl,
  error,
  onPublish,
}: PublishDialogProps) {
  const [target, setTarget] = useState<PublishTarget>('bluesky')
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')

  if (!open) return null

  const publishing = phase === 'publishing'
  const succeeded = phase === 'success'
  const copy = TARGET_COPY[target]

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[26rem] max-w-[90%] rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-white">Publish</h2>

        {!isSignedIn ? (
          <p className="text-sm text-zinc-400">
            Sign in (top right) to publish your image.
          </p>
        ) : succeeded ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">{copy.done}</p>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-sm text-violet-400 hover:text-violet-300"
              >
                View your {copy.noun} ↗
              </a>
            )}
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-xs text-zinc-400">Publish to</span>
              <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
                {TARGETS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTarget(t.value)}
                    disabled={publishing}
                    aria-pressed={target === t.value}
                    className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                      target === t.value
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="publish-alt" className="mb-1 block text-xs text-zinc-400">
                Alt text (image description)
              </label>
              <Input
                id="publish-alt"
                autoFocus
                placeholder="Describe the image"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                disabled={publishing}
              />
            </div>
            <div>
              <label htmlFor="publish-caption" className="mb-1 block text-xs text-zinc-400">
                Caption (optional)
              </label>
              <textarea
                id="publish-caption"
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
                onClick={() => onPublish({ alt: alt.trim(), caption: caption.trim(), target })}
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
