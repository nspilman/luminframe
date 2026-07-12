import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { imagePagePath } from '@/lib/galleryRoute'
import { ImageDetail } from './ImageDetail'

interface ImageLightboxProps {
  image: LuminframeImageView
  onClose: () => void
  /** Whether the viewer owns this record and may delete it. */
  canDelete?: boolean
  /** Deletes the record; rejects on failure so the dialog can surface it. */
  onDelete?: () => Promise<void>
}

/**
 * Quick-preview viewer for a single Luminframe record — the fast click from the
 * gallery grid that keeps you in the grid (Esc returns you). It's a preview over
 * the gallery; the canonical *home* is the image page, linked from inside via
 * "Open image page." Closes on Escape, backdrop click, or the X; locks body
 * scroll, moves focus in on open, and restores it to the opener on close.
 */
export function ImageLightbox({ image, onClose, canDelete, onDelete }: ImageLightboxProps) {
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
      <div onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-6xl">
        <ImageDetail
          image={image}
          canDelete={canDelete}
          onDelete={onDelete}
          permalinkTo={imagePagePath(image.did, image.rkey)}
        />
      </div>
    </div>
  )
}
