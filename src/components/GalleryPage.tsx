import { useMemo, useState } from 'react'
import { useLocation, useSearchParams, NavLink } from 'react-router-dom'
import { ImageOff, LogIn, AlertCircle } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { ImageLightbox } from './ImageLightbox'
import { useLuminframeFeed, FeedTab } from '@/hooks/useLuminframeFeed'
import { useOpenImage } from '@/hooks/useOpenImage'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { effectLabel, formatDate, bskyProfileUrl } from '@/lib/luminframeImagePresentation'
import { tabFromPath, pathForTab, IMAGE_PARAM } from '@/lib/galleryRoute'

interface GalleryPageProps {
  /** The signed-in user's DID, or null when signed out (gates the "mine" tab). */
  did: string | null
  /** Deletes one of the viewer's own records by AT-URI. */
  onDeleteImage: (uri: string) => Promise<void>
}

const TABS: { value: FeedTab; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'network', label: 'Network' },
]

function ImageCard({ image, onOpen }: { image: LuminframeImageView; onOpen: () => void }) {
  const profileUrl = bskyProfileUrl(image)
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
export function GalleryPage({ did, onDeleteImage }: GalleryPageProps) {
  // The URL is the source of truth: the scope is the path, the open image is a
  // query param. Nothing about where you are lives in local state anymore.
  const tab = tabFromPath(useLocation().pathname)
  const [searchParams, setSearchParams] = useSearchParams()
  const feed = useLuminframeFeed(tab, did)

  // Records deleted this session, hidden optimistically so the grid updates the
  // instant a delete succeeds without a refetch.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())
  const images = useMemo(
    () => feed.images.filter((i) => !removed.has(i.uri)),
    [feed.images, removed]
  )
  const openImage = useOpenImage(searchParams.get(IMAGE_PARAM), images)

  const openInLightbox = (image: LuminframeImageView) =>
    setSearchParams((prev) => {
      prev.set(IMAGE_PARAM, image.uri) // pushes history, so Back closes the viewer
      return prev
    })

  const closeLightbox = () =>
    setSearchParams(
      (prev) => {
        prev.delete(IMAGE_PARAM)
        return prev
      },
      { replace: true } // replace, so Back doesn't reopen what you just closed
    )

  // Delete propagates errors to the lightbox (which shows them); only on success
  // do we hide the record and close the viewer.
  const handleDelete = async (uri: string) => {
    await onDeleteImage(uri)
    setRemoved((prev) => new Set(prev).add(uri))
    closeLightbox()
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Gallery</h2>
          <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
            {TABS.map((t) => (
              <NavLink
                key={t.value}
                to={pathForTab(t.value)}
                end
                className={`rounded px-4 py-1.5 text-sm transition-colors ${
                  tab === t.value ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                {t.label}
              </NavLink>
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

        {feed.status === 'loaded' && images.length === 0 && (
          <CenterState icon={<ImageOff className="h-8 w-8" />}>
            {tab === 'mine'
              ? 'You haven’t saved any Luminframe images yet. Edit a photo and Publish → My PDS.'
              : 'No Luminframe images on the network yet. Be the first — Publish → My PDS.'}
          </CenterState>
        )}

        {feed.status === 'loaded' && images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <ImageCard key={image.uri} image={image} onOpen={() => openInLightbox(image)} />
            ))}
          </div>
        )}
      </div>

      {openImage && (
        <ImageLightbox
          image={openImage}
          onClose={closeLightbox}
          canDelete={!!did && openImage.did === did}
          onDelete={() => handleDelete(openImage.uri)}
        />
      )}
    </div>
  )
}
