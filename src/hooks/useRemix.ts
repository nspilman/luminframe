import { fetchImageByUri } from '@/infrastructure/atproto/luminframeFeed'
import { REMIX_PARAM } from '@/lib/galleryRoute'
import { useUrlParamAction } from './useUrlParamAction'
import { StrongRef } from '@/types/atproto'

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
 * lineage. This is how a gallery image is "opened in the editor" without threading
 * a callback through the component tree: the action is just a link to this address.
 * useUrlParamAction clears the param once honored (see there for the semantics).
 */
export function useRemix(loadRemix: (file: File, parent?: StrongRef) => void): void {
  useUrlParamAction(
    REMIX_PARAM,
    async (uri) => {
      const view = await fetchImageByUri(uri)
      const file = view?.imageUrl ? await urlToFile(view.imageUrl) : null
      // Carry provenance only when the record resolved with a CID (needed for a
      // strong ref), else claim no lineage.
      const parent = view && view.cid ? { uri: view.uri, cid: view.cid } : undefined
      return { file, parent }
    },
    ({ file, parent }) => {
      if (file) loadRemix(file, parent)
    }
  )
}
