import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Spinner } from './ui/spinner'
import { PublishPhase, PublishOutcome, PublishTarget, ShareTarget } from '@/hooks/usePublish'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  isSignedIn: boolean
  phase: PublishPhase
  outcomes: PublishOutcome[]
  error: string | null
  onPublish: (input: { alt: string; caption: string; shareTo: ShareTarget[] }) => void
}

/** The opt-in cross-post destinations, in display order. */
const SHARES: { value: ShareTarget; label: string; blurb: string }[] = [
  { value: 'bluesky', label: 'Bluesky', blurb: 'Post it to your feed' },
  { value: 'grain', label: 'Grain', blurb: 'Add it to your Grain gallery' },
]

/** Per-destination result wording. */
const TARGET_COPY: Record<PublishTarget, { ok: string; failed: string; link: string }> = {
  luminframe: { ok: 'Saved to your PDS', failed: 'Couldn’t save to your PDS', link: 'View record' },
  bluesky: { ok: 'Posted to Bluesky', failed: 'Couldn’t post to Bluesky', link: 'View post' },
  grain: { ok: 'Published to Grain', failed: 'Couldn’t publish to Grain', link: 'View gallery' },
}

function OutcomeRow({ outcome }: { outcome: PublishOutcome }) {
  const copy = TARGET_COPY[outcome.target]
  const ok = outcome.status === 'ok'
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={`flex items-center gap-2 ${ok ? 'text-zinc-300' : 'text-red-400'}`}>
        {ok ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        {ok ? copy.ok : copy.failed}
      </span>
      {ok && outcome.url && (
        <a
          href={outcome.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-violet-400 hover:text-violet-300"
        >
          {copy.link} ↗
        </a>
      )}
    </div>
  )
}

/**
 * Modal for saving the current render. Every save writes a com.luminframe.image
 * record to the user's PDS; Bluesky and Grain are opt-in cross-posts toggled
 * alongside it. Collects a required alt description and an optional caption, then
 * reflects progress: a spinner while in flight, per-destination results on
 * success (the save always, plus each selected share — any of which may have
 * failed on its own), or an inline error if the save itself failed.
 */
export function PublishDialog({
  open,
  onClose,
  isSignedIn,
  phase,
  outcomes,
  error,
  onPublish,
}: PublishDialogProps) {
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [shares, setShares] = useState<Record<ShareTarget, boolean>>({
    bluesky: false,
    grain: false,
  })

  if (!open) return null

  const publishing = phase === 'publishing'
  const succeeded = phase === 'success'
  const anyShare = shares.bluesky || shares.grain

  const submit = () => {
    const shareTo = (Object.keys(shares) as ShareTarget[]).filter((t) => shares[t])
    onPublish({ alt: alt.trim(), caption: caption.trim(), shareTo })
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[26rem] max-w-[90%] rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-white">Save</h2>

        {!isSignedIn ? (
          <p className="text-sm text-zinc-400">
            Sign in (top right) to save your image to your PDS.
          </p>
        ) : succeeded ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              {outcomes.map((o) => (
                <OutcomeRow key={o.target} outcome={o} />
              ))}
            </div>
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
                rows={2}
                placeholder="Say something about it…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={publishing}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs text-zinc-400">Also share to</span>
              {SHARES.map((s) => (
                <label
                  key={s.value}
                  htmlFor={`share-${s.value}`}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="text-sm text-zinc-200">{s.label}</span>
                    <span className="text-[11px] text-zinc-500">{s.blurb}</span>
                  </span>
                  <Switch
                    id={`share-${s.value}`}
                    checked={shares[s.value]}
                    onCheckedChange={(v) => setShares((prev) => ({ ...prev, [s.value]: v }))}
                    disabled={publishing}
                  />
                </label>
              ))}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={publishing}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-violet-600 text-white hover:bg-violet-500"
                disabled={publishing || !alt.trim()}
                onClick={submit}
              >
                {publishing ? <Spinner size="sm" /> : anyShare ? 'Save & share' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
