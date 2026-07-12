import { useState } from 'react'
import { ImageOff, LogIn, AlertCircle } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { ImageLightbox } from './ImageLightbox'
import { useLuminframeFeed, FeedTab } from '@/hooks/useLuminframeFeed'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { shaderLibrary } from '@/lib/shaders'
import { ShaderType } from '@/types/shader'

interface GalleryPageProps {
  /** The signed-in user's DID, or null when signed out (gates the "mine" tab). */
  did: string | null
}

const TABS: { value: FeedTab; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'network', label: 'Network' },
]

/** Effect key → display name, falling back to the raw key for anything unknown. */
function effectLabel(key: string): string {
  return shaderLibrary[key as ShaderType]?.name ?? key
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

function ImageCard({ image, onOpen }: { image: LuminframeImageView; onOpen: () => void }) {
  const profileUrl = `https://bsky.app/profile/${image.handle ?? image.did}`
  return (
    <div className="group overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30">
      <button
        type="button"
        onClick={onOpen}
        aria-label={image.title ? `Open ${image.title}` : 'Open image'}
        className="block aspect-square w-full overflow-hidden bg-black/40"
      >
        {image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={image.alt ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageOff className="h-6 w-6" />
          </span>
        )}
      </button>
      <div className="space-y-2 p-3">
        {image.title && <p className="truncate text-sm font-medium text-zinc-200">{image.title}</p>}
        {image.effects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.effects.slice(0, 4).map((key, i) => (
              <span
                key={`${key}-${i}`}
                className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300"
              >
                {effectLabel(key)}
              </span>
            ))}
            {image.effects.length > 4 && (
              <span className="px-1 py-0.5 text-[10px] text-zinc-500">+{image.effects.length - 4}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-zinc-400 hover:text-violet-300"
          >
            @{image.handle ?? image.did.slice(0, 18) + '…'}
          </a>
          <span className="shrink-0 tabular-nums">{formatDate(image.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

function CenterState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-zinc-500">
      {icon}
      <p className="max-w-sm text-sm">{children}</p>
    </div>
  )
}

/**
 * The gallery of com.luminframe.image records — the user's own ("Mine") or every
 * one across the network ("Network"), read live from PDSes via luminframeFeed.
 * A public read: the Network tab works signed-out; Mine asks for sign-in.
 */
export function GalleryPage({ did }: GalleryPageProps) {
  const [tab, setTab] = useState<FeedTab>('network')
  const [openImage, setOpenImage] = useState<LuminframeImageView | null>(null)
  const feed = useLuminframeFeed(tab, did)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Gallery</h2>
          <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                aria-pressed={tab === t.value}
                className={`rounded px-4 py-1.5 text-sm transition-colors ${
                  tab === t.value ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {feed.status === 'loading' && (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        )}

        {feed.status === 'signed-out' && (
          <CenterState icon={<LogIn className="h-8 w-8" />}>
            Sign in (top right) to see the Luminframe images you’ve saved to your PDS.
          </CenterState>
        )}

        {feed.status === 'error' && (
          <CenterState icon={<AlertCircle className="h-8 w-8 text-red-400/70" />}>
            Couldn’t load the gallery. {feed.error}
          </CenterState>
        )}

        {feed.status === 'loaded' && feed.images.length === 0 && (
          <CenterState icon={<ImageOff className="h-8 w-8" />}>
            {tab === 'mine'
              ? 'You haven’t saved any Luminframe images yet. Edit a photo and Publish → My PDS.'
              : 'No Luminframe images on the network yet. Be the first — Publish → My PDS.'}
          </CenterState>
        )}

        {feed.status === 'loaded' && feed.images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {feed.images.map((image) => (
              <ImageCard key={image.uri} image={image} onOpen={() => setOpenImage(image)} />
            ))}
          </div>
        )}
      </div>

      {openImage && <ImageLightbox image={openImage} onClose={() => setOpenImage(null)} />}
    </div>
  )
}
