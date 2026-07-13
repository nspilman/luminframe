import { useMemo, useState } from 'react'
import { useLocation, useSearchParams, NavLink } from 'react-router-dom'
import { ImageOff, LogIn, AlertCircle } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { ImageLightbox } from './ImageLightbox'
import { useLuminframeFeed, FeedTab } from '@/hooks/useLuminframeFeed'
import { useOpenImage } from '@/hooks/useOpenImage'
import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { effectLabel, formatDate, bskyProfileUrl } from '@/lib/luminframeImagePresentation'
import { tabFromPath, pathForTab, IMAGE_PARAM, FAMILY_PARAM } from '@/lib/galleryRoute'
import { familiesOf, isEffectCategory, effectFamilies, EffectCategory } from '@/lib/shaders/catalog'

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
 * Browse the gallery by look: one chip per effect family actually present in the
 * feed, plus an "All" reset. Offering only present families keeps the rail honest
 * — no control that would yield an empty grid. The active family lives in the URL,
 * so a filtered view is a link.
 */
function FilterRail({
  families,
  active,
  onSelect,
}: {
  families: { id: EffectCategory; label: string }[]
  active: EffectCategory | null
  onSelect: (id: EffectCategory | null) => void
}) {
  const chip = (isActive: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      isActive
        ? 'bg-violet-600 text-white'
        : 'border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
    }`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onSelect(null)} className={chip(active === null)}>
        All
      </button>
      {families.map((family) => (
        <button
          key={family.id}
          type="button"
          onClick={() => onSelect(family.id)}
          className={chip(active === family.id)}
        >
          {family.label}
        </button>
      ))}
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

  // Discover by look. The active family is read from the URL (validated, so a junk
  // ?family= just means unfiltered); the rail offers only families present in this
  // feed; the grid narrows to images wearing the active look.
  const familyParam = searchParams.get(FAMILY_PARAM)
  const activeFamily = familyParam && isEffectCategory(familyParam) ? familyParam : null

  const availableFamilies = useMemo(() => {
    const present = new Set<EffectCategory>()
    for (const image of images) for (const family of familiesOf(image.effects)) present.add(family)
    return effectFamilies.filter((family) => present.has(family.id))
  }, [images])

  const visibleImages = useMemo(
    () => (activeFamily ? images.filter((i) => familiesOf(i.effects).has(activeFamily)) : images),
    [images, activeFamily]
  )

  const setFamily = (id: EffectCategory | null) =>
    setSearchParams(
      (prev) => {
        if (id) prev.set(FAMILY_PARAM, id)
        else prev.delete(FAMILY_PARAM)
        return prev
      },
      { replace: true } // a filter refines the current place; Back shouldn't step through each try
    )

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
          <div className="space-y-6">
            {availableFamilies.length > 0 && (
              <FilterRail families={availableFamilies} active={activeFamily} onSelect={setFamily} />
            )}

            {visibleImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleImages.map((image) => (
                  <ImageCard key={image.uri} image={image} onOpen={() => openInLightbox(image)} />
                ))}
              </div>
            ) : (
              // Reachable only via a direct ?family= link to a look nothing in this
              // feed wears — the rail can't produce it, since it offers present looks only.
              <CenterState icon={<ImageOff className="h-8 w-8" />}>
                No images with a {effectFamilies.find((f) => f.id === activeFamily)?.label ?? 'matching'} look here yet.{' '}
                <button
                  type="button"
                  onClick={() => setFamily(null)}
                  className="text-violet-300 underline hover:text-violet-200"
                >
                  Show all
                </button>
              </CenterState>
            )}
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
