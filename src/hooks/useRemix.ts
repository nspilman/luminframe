import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchImageByUri } from '@/infrastructure/atproto/luminframeFeed'
import { REMIX_PARAM } from '@/lib/galleryRoute'

/** A rough extension for a blob's MIME type, for a friendlier File name. */
function extFor(mime: string): string {
  return mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
}

/**
 * Fetch a remote image URL into an in-memory File. Fetching first (rather than
 * pointing a texture at the remote URL) is what keeps the editor's WebGL canvas
 * untainted: the File becomes a same-origin object URL, so the result stays
 * exportable. Returns null on any failure — a bad remix link just shouldn't load.
 */
async function urlToFile(url: string): Promise<File | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const type = blob.type || 'image/png'
    return new File([blob], `remix.${extFor(type)}`, { type })
  } catch {
    return null
  }
}

/**
 * Honors the editor's ?remix=<at-uri> address: resolves the record, pulls its
 * image into a File, and hands it to the editor's remix door as a fresh source —
 * carrying the record's {uri, cid} as provenance so a subsequent save records the
 * lineage — then clears the param so a reload or Back doesn't re-trigger the load.
 * This is how a gallery image is "opened in the editor" without threading a
 * callback through the component tree: the action is just a link to this address.
 */
export function useRemix(loadRemix: (file: File, parent?: { uri: string; cid: string }) => void): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const remixUri = searchParams.get(REMIX_PARAM)

  // Hold the loader in a ref so the effect depends only on the URI, not on the
  // loader's identity — we want it to fire once per remix, not on every render.
  const loadRef = useRef(loadRemix)
  loadRef.current = loadRemix

  useEffect(() => {
    if (!remixUri) return
    let active = true

    const clearParam = () =>
      setSearchParams(
        (prev) => {
          prev.delete(REMIX_PARAM)
          return prev
        },
        { replace: true }
      )

    ;(async () => {
      const view = await fetchImageByUri(remixUri)
      const file = view?.imageUrl ? await urlToFile(view.imageUrl) : null
      if (!active) return
      // Always load the image if we got it; carry provenance only when the record
      // resolved with a CID (needed for a strong ref), else claim no lineage.
      if (file) {
        const parent = view && view.cid ? { uri: view.uri, cid: view.cid } : undefined
        loadRef.current(file, parent)
      }
      clearParam()
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixUri])
}
