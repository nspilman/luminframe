import { Link } from 'react-router-dom'
import { GitBranch, ChevronRight, ImageOff } from 'lucide-react'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { imagePagePath } from '@/lib/galleryRoute'
import { Lineage } from '@/hooks/useLineage'
import { Spinner } from './ui/spinner'

/** A small square image + author, linking to that image's own page. */
function LineageThumb({ image }: { image: LuminframeImageView }) {
  return (
    <Link to={imagePagePath(image.did, image.rkey)} className="group block w-20 shrink-0 space-y-1">
      <div className="aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-black/40">
        {image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={image.alt ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageOff className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="truncate text-[11px] text-zinc-500 transition-colors group-hover:text-violet-300">
        @{image.handle ?? image.did.slice(0, 12) + '…'}
      </p>
    </Link>
  )
}

const SECTION_LABEL = 'text-[11px] uppercase tracking-wide text-zinc-600'

/**
 * One image's family, made visible: the remix chain it descends from, then the
 * image itself, then the remixes made from it. This is the reverse-link that
 * remixOf only ever pointed one way through — you could walk up to a parent, but
 * never see who built on you. It lives on the canonical image page (not the
 * lightbox), since the children need a network scan to find.
 *
 * Shown once loaded; while resolving, a quiet line signals more is coming. On the
 * canonical page even a lonely image gets the panel — "No remixes yet" is a gentle
 * invitation, not an error.
 */
export function LineagePanel({ lineage }: { lineage: Lineage }) {
  if (lineage.status === 'error') return null

  if (lineage.status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-5 text-xs text-zinc-500">
        <Spinner size="sm" /> Tracing lineage…
      </div>
    )
  }

  const { ancestors, children } = lineage

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <GitBranch className="h-4 w-4 text-violet-300" />
        Lineage
      </h3>

      {ancestors.length > 0 && (
        <div className="space-y-2">
          <p className={SECTION_LABEL}>Descended from</p>
          <div className="flex flex-wrap items-end gap-2">
            {ancestors.map((ancestor) => (
              <div key={ancestor.uri} className="flex items-end gap-2">
                <LineageThumb image={ancestor} />
                <ChevronRight className="mb-6 h-4 w-4 shrink-0 text-zinc-700" />
              </div>
            ))}
            <span className="mb-6 rounded-md border border-violet-500/40 px-2.5 py-1 text-xs font-medium text-violet-200">
              This image
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className={SECTION_LABEL}>
          Remixes{children.length > 0 && ` (${children.length})`}
        </p>
        {children.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {children.map((child) => (
              <LineageThumb key={child.uri} image={child} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No remixes yet — open this in the editor to make the first.</p>
        )}
      </div>
    </section>
  )
}
