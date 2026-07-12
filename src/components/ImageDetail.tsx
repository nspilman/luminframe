import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Calendar, Wand2, Trash2, Maximize2, GitBranch, Sparkles } from 'lucide-react'
import { LuminframeImageView, parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { effectLabel, formatDate, bskyProfileUrl, pdslsUrl } from '@/lib/luminframeImagePresentation'
import { editorRemixPath, editorApplyRecipePath, imagePagePath } from '@/lib/galleryRoute'
import { Spinner } from './ui/spinner'

interface ImageDetailProps {
  image: LuminframeImageView
  /** Whether the viewer owns this record and may delete it. */
  canDelete?: boolean
  /** Deletes the record; rejects on failure so this surfaces it. On success the parent unmounts. */
  onDelete?: () => Promise<void>
  /** When set, shows an "Open image page" link to this route (the modal's path to the canonical page). */
  permalinkTo?: string
}

/**
 * The image and its info panel — the shared body of both the quick-preview
 * lightbox and the canonical image page. Holds everything intrinsic to viewing
 * one record (the picture, title, author, date, alt, effects, and the actions:
 * open-in-editor, the pdsls record link, and a two-step owner delete). The two
 * hosts supply only their own chrome around it (modal backdrop vs. page frame).
 */
export function ImageDetail({ image, canDelete, onDelete, permalinkTo }: ImageDetailProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const runDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete()
    } catch (err) {
      setDeleting(false)
      setConfirming(false)
      setDeleteError('Couldn’t delete. Please try again.')
      console.error('Delete failed:', err)
    }
  }

  const date = formatDate(image.createdAt, 'medium')
  // The parent this was remixed from — a link to its canonical page, when the
  // lineage ref resolves to an image address.
  const parent = image.remixOf ? parseAtUri(image.remixOf.uri) : null

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950/80 md:flex-row">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 md:p-4">
        {image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={image.alt ?? ''}
            className="max-h-[50vh] w-auto max-w-full object-contain md:max-h-[80vh]"
          />
        ) : (
          <span className="py-24 text-sm text-zinc-600">Image unavailable</span>
        )}
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-zinc-800/60 p-5 md:w-80 md:border-l md:border-t-0">
        {image.title && <h2 className="text-lg font-semibold text-white">{image.title}</h2>}

        <a
          href={bskyProfileUrl(image)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-300 hover:text-violet-300"
        >
          @{image.handle ?? image.did.slice(0, 24) + '…'}
        </a>

        {date && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="tabular-nums">{date}</span>
          </div>
        )}

        {parent && (
          <Link
            to={imagePagePath(parent.did, parent.rkey)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-violet-300"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Remixed from another image
          </Link>
        )}

        {/* The image already carries `alt` as its accessible description, so this
            visible echo is hidden from AT to avoid announcing it twice. */}
        {image.alt && (
          <p aria-hidden className="text-sm leading-relaxed text-zinc-400">
            {image.alt}
          </p>
        )}

        {image.effects.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-600">Effects</p>
            <div className="flex flex-wrap gap-1.5">
              {image.effects.map((key, i) => (
                <span
                  key={`${key}-${i}`}
                  className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-300"
                >
                  {effectLabel(key)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Link
            to={editorRemixPath(image.uri)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Wand2 className="h-4 w-4" />
            Open in editor
          </Link>

          {image.recipe && image.recipe.length > 0 && (
            <Link
              to={editorApplyRecipePath(image.uri)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-500/10"
            >
              <Sparkles className="h-4 w-4" />
              Apply this recipe
            </Link>
          )}

          {permalinkTo && (
            <Link
              to={permalinkTo}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-violet-300"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Open image page
            </Link>
          )}

          <a
            href={pdslsUrl(image)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View record on pdsls.dev
          </a>

          {canDelete && onDelete && (
            <div className="mt-1 border-t border-zinc-800/60 pt-3">
              {deleting ? (
                <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                  <Spinner size="sm" /> Deleting…
                </span>
              ) : confirming ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">Delete this image from your PDS? This can’t be undone.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="flex-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={runDelete}
                      className="flex-1 rounded-md bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
              {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
