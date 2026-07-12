import { useEffect } from 'react'
import { X, ExternalLink, Calendar } from 'lucide-react'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { shaderLibrary } from '@/lib/shaders'
import { ShaderType } from '@/types/shader'

interface ImageLightboxProps {
  image: LuminframeImageView
  onClose: () => void
}

/** Effect key → display name, falling back to the raw key for anything unknown. */
function effectLabel(key: string): string {
  return shaderLibrary[key as ShaderType]?.name ?? key
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/**
 * Full-size in-app viewer for a single Luminframe record. Opening this — not a
 * jump to pdsls.dev — is the primary click from the gallery grid; the record page
 * is demoted to a secondary link in the info panel. Closes on Escape, backdrop
 * click, or the X. Locks body scroll while open.
 */
export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const profileUrl = `https://bsky.app/profile/${image.handle ?? image.did}`
  const date = formatDate(image.createdAt)

  return (
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

          {image.alt && <p className="text-sm leading-relaxed text-zinc-400">{image.alt}</p>}

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

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <a
              href={`https://pdsls.dev/${image.uri}`}
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
