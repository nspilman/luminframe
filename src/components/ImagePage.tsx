import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { ImageDetail } from './ImageDetail'
import { LineagePanel } from './LineagePanel'
import {
  fetchImageByUri,
  LuminframeImageView,
  LUMINFRAME_COLLECTION,
} from '@/infrastructure/atproto/luminframeFeed'
import { useLineage } from '@/hooks/useLineage'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { imagePageMeta, staticPageMeta } from '@/lib/pageMeta'
import { parseImagePath, GALLERY_ROOT, pathForTab } from '@/lib/galleryRoute'

interface ImagePageProps {
  /** The signed-in user's DID, or null — gates whether delete is offered. */
  viewerDid: string | null
  /** Deletes one of the viewer's own records by AT-URI. */
  onDeleteImage: (uri: string) => Promise<void>
}

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; image: LuminframeImageView }
  | { status: 'not-found' }

/**
 * The canonical page for one image — the address you share. Resolves the record
 * standalone from its author's PDS (by the did + rkey in the path), so a cold or
 * shared link works without the gallery ever loading. Renders the same
 * ImageDetail the lightbox does, wrapped in page chrome.
 */
export function ImagePage({ viewerDid, onDeleteImage }: ImagePageProps) {
  const pathname = useLocation().pathname
  const navigate = useNavigate()
  const parsed = parseImagePath(pathname)
  const uri = parsed ? `at://${parsed.did}/${LUMINFRAME_COLLECTION}/${parsed.rkey}` : null

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const lineage = useLineage(state.status === 'loaded' ? state.image : null)

  // Share metadata: the record's own image and title once it resolves; a neutral
  // fallback while loading or if it's gone. (Non-JS crawlers get the same from the
  // edge function, which resolves the record server-side.)
  const canonicalUrl = window.location.origin + pathname
  useDocumentMeta(
    state.status === 'loaded'
      ? imagePageMeta(
          {
            title: state.image.title,
            alt: state.image.alt,
            handle: state.image.handle,
            imageUrl: state.image.imageUrl,
          },
          canonicalUrl
        )
      : staticPageMeta(pathname, canonicalUrl)
  )

  useEffect(() => {
    if (!uri) {
      setState({ status: 'not-found' })
      return
    }
    let active = true
    setState({ status: 'loading' })
    fetchImageByUri(uri).then((image) => {
      if (active) setState(image ? { status: 'loaded', image } : { status: 'not-found' })
    })
    return () => {
      active = false
    }
  }, [uri])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link
          to={GALLERY_ROOT}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-violet-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Gallery
        </Link>

        {state.status === 'loading' && (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        )}

        {state.status === 'not-found' && (
          <div className="flex flex-col items-center gap-3 py-24 text-center text-zinc-500">
            <AlertCircle className="h-8 w-8 text-red-400/70" />
            <p className="max-w-sm text-sm">
              This image couldn’t be found. It may have been deleted, or the link is wrong.
            </p>
          </div>
        )}

        {state.status === 'loaded' && (
          <>
            <ImageDetail
              image={state.image}
              canDelete={!!viewerDid && state.image.did === viewerDid}
              onDelete={async () => {
                await onDeleteImage(state.image.uri)
                // The record is gone — send the owner back to their gallery.
                navigate(pathForTab('mine'))
              }}
            />
            <LineagePanel lineage={lineage} />
          </>
        )}
      </div>
    </div>
  )
}
