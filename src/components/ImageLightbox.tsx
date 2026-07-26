import { X } from 'lucide-react'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { imagePagePath } from '@/lib/galleryRoute'
import { ImageDetail } from './ImageDetail'
import { ModalPortal } from './ui/modal-portal'

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
 * "Open image page." Closes on backdrop click or the X; Escape, scroll lock,
 * and focus handling live in ModalPortal, shared by every dialog.
 */
export function ImageLightbox({ image, onClose, canDelete, onDelete }: ImageLightboxProps) {
  return (
    <ModalPortal onDismiss={onClose}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.title ?? 'Luminframe image'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-8"
    >
      <button
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
    </ModalPortal>
  )
}
