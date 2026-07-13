import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ImageOff } from 'lucide-react'
import { useLuminframeFeed } from '@/hooks/useLuminframeFeed'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { editorRemixPath } from '@/lib/galleryRoute'
import { Spinner } from './ui/spinner'

/** One public image, clickable to start from. */
function PickThumb({ image, onPick }: { image: LuminframeImageView; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={image.title ?? 'Start from this image'}
      className="group block overflow-hidden rounded-lg border border-zinc-800 bg-black/40 transition-colors hover:border-violet-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <div className="aspect-square overflow-hidden">
        {image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={image.alt ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageOff className="h-5 w-5" />
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * Pick a public Luminframe image to start editing from. Starting from someone's
 * image is a remix, so a pick goes through the ?remix= door — the source loads
 * carrying its provenance, and a later save records lineage back to it (the same
 * path Surprise me and the gallery's "Open in editor" take). Reads the public
 * network feed; mounted only while open, so the scan runs on demand.
 *
 * Modal chrome mirrors the lightbox: closes on Escape, backdrop, or the X; locks
 * body scroll; moves focus in on open and restores it to the opener on close.
 */
export function SourcePickerDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const feed = useLuminframeFeed('network', null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [onClose])

  const pick = (image: LuminframeImageView) => {
    navigate(editorRemixPath(image.uri))
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start from a public image"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/60 p-4">
          <h2 className="text-sm font-semibold text-white">Start from a public image</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-white/5 p-1.5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {feed.status === 'loading' && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )}
          {feed.status === 'error' && (
            <p className="py-16 text-center text-sm text-zinc-500">Couldn’t load public images. {feed.error}</p>
          )}
          {feed.status === 'loaded' && feed.images.length === 0 && (
            <p className="py-16 text-center text-sm text-zinc-500">No public images to start from yet.</p>
          )}
          {feed.status === 'loaded' && feed.images.length > 0 && (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                Pick one to open it in the editor — your edits build on it, credited back to the original.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {feed.images.map((image) => (
                  <PickThumb key={image.uri} image={image} onPick={() => pick(image)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
