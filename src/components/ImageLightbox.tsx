import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, ExternalLink, Calendar, Wand2 } from 'lucide-react'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { effectLabel, formatDate, bskyProfileUrl, pdslsUrl } from '@/lib/luminframeImagePresentation'
import { editorRemixPath } from '@/lib/galleryRoute'

interface ImageLightboxProps {
  image: LuminframeImageView
  onClose: () => void
}

/**
 * Full-size in-app viewer for a single Luminframe record. Opening this — not a
 * jump to pdsls.dev — is the primary click from the gallery grid; the record page
 * is demoted to a secondary link in the info panel. Closes on Escape, backdrop
 * click, or the X. Locks body scroll while open, moves focus into the dialog on
 * open, and restores it to whatever opened it on close.
 */
export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Pull focus into the dialog so the keyboard lands inside it, and hand focus
    // back to the triggering element when we close so the user keeps their place.
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [onClose])

  const profileUrl = bskyProfileUrl(image)
  const date = formatDate(image.createdAt, 'medium')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.title ?? 'Luminframe image'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-8"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Stop propagation so clicks inside the panel don't close it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950/80 md:flex-row"
      >
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
            href={profileUrl}
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
            <a
              href={pdslsUrl(image)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View record on pdsls.dev
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}
