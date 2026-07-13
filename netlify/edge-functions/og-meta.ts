// Netlify Edge Function — injects page-specific share metadata into the served
// HTML so crawlers that DON'T run JavaScript (X, Facebook, Discord, iMessage,
// LinkedIn) unfurl a shared link correctly. This is the server-side half of share
// metadata; the client half (useDocumentMeta) covers the browser and JS crawlers.
// Both read the one source of truth in src/lib/pageMeta.ts.
//
// Everything here is best-effort: on any failure it returns the origin response
// untouched, so a bad lookup or a parse miss can never break the page. Runs in the
// Deno edge runtime — hence the explicit .ts import and native fetch.
import {
  imagePageMeta,
  staticPageMeta,
  renderMetaTags,
  type ImageMetaInput,
} from '../../src/lib/pageMeta.ts'

const COLLECTION = 'com.luminframe.image'
const PLC_DIRECTORY = 'https://plc.directory'

/** Resolve one image record to its share fields, server-side. Null on any miss. */
async function resolveImage(did: string, rkey: string): Promise<ImageMetaInput | null> {
  try {
    const doc = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}`).then((r) =>
      r.ok ? r.json() : null
    )
    if (!doc) return null
    const pds = doc.service?.find((s: { id: string }) => s.id.endsWith('atproto_pds'))
      ?.serviceEndpoint as string | undefined
    const aka = (doc.alsoKnownAs as string[] | undefined)?.find((a) => a.startsWith('at://'))
    const handle = aka ? aka.slice('at://'.length) : null
    if (!pds) return null

    const params = new URLSearchParams({ repo: did, collection: COLLECTION, rkey })
    const record = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?${params}`).then((r) =>
      r.ok ? r.json() : null
    )
    const value = record?.value
    if (!value) return null

    const cid = value.image?.ref?.$link
    const imageUrl = cid
      ? `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
      : null
    return { title: value.title, alt: value.alt, handle, imageUrl }
  } catch {
    return null
  }
}

export default async (
  request: Request,
  context: { next: () => Promise<Response> }
): Promise<Response> => {
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return response

  try {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const match = path.match(/^\/image\/([^/]+)\/([^/]+)$/)

    const meta = match
      ? imagePageMeta(
          (await resolveImage(decodeURIComponent(match[1]), decodeURIComponent(match[2]))) ?? {},
          request.url
        )
      : staticPageMeta(path, request.url)

    const html = await response.text()
    const injected = html
      // Drop the static defaults so nothing is duplicated…
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/\s*<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>/gi, '')
      // …then insert the page-specific set just before </head>.
      .replace(/<\/head>/i, `    ${renderMetaTags(meta)}\n  </head>`)

    const headers = new Headers(response.headers)
    headers.delete('content-length') // the body length changed
    return new Response(injected, { status: response.status, headers })
  } catch {
    return response
  }
}

export const config = {
  path: '/*',
  // Skip static assets — they're never HTML, and this keeps the function off the
  // hot path for scripts, styles, and images.
  excludedPath: ['/assets/*', '/*.png', '/*.jpg', '/*.svg', '/*.ico', '/*.json', '/*.txt', '/_redirects'],
}
