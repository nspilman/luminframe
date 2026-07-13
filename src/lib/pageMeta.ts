/**
 * Page-specific share metadata — title, description, Open Graph, Twitter Card —
 * as one source of truth consumed by two renderers:
 *
 *   - useDocumentMeta sets these on the document head in-browser (correct tab
 *     titles, and unfurls for crawlers that execute JS, e.g. Slack).
 *   - the Netlify edge function (netlify/edge-functions/og-meta.ts) injects the
 *     same tags into the served HTML, so crawlers that DON'T run JS — X, Facebook,
 *     Discord, iMessage — unfurl a shared link correctly. That server-side pass is
 *     what makes sharing robust for a client-rendered app.
 *
 * Deliberately zero-import so the exact same module runs in the Vite app and in
 * the Deno edge runtime.
 */

export const SITE = {
  name: 'Luminframe',
  url: 'https://luminframe.com',
  description:
    'Edit a photo with live shader looks, then save it to your own repo on the AT Protocol — yours to keep, share, and remix.',
  image: 'https://luminframe.com/luminframe.png',
} as const

export interface PageMeta {
  title: string
  description: string
  /** Absolute URL of the share image. */
  image: string
  /** Canonical absolute URL of the page. */
  url: string
  card: 'summary' | 'summary_large_image'
}

/** Escape a string for safe insertion into HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** What the metadata for one Luminframe image record needs. */
export interface ImageMetaInput {
  title?: string
  alt?: string
  handle?: string | null
  /** Absolute getBlob URL of the rendered image, if the record carried one. */
  imageUrl?: string | null
}

/** Metadata for the standalone image page — the record's own image is the card. */
export function imagePageMeta(image: ImageMetaInput, url: string): PageMeta {
  const by = image.handle ? ` by @${image.handle}` : ''
  const title = image.title ? `${image.title} — ${SITE.name}` : `${SITE.name} image${by}`
  const description =
    image.alt?.trim() || `An image edited with ${SITE.name}'s shader effects${by}.`
  return {
    title,
    description,
    image: image.imageUrl || SITE.image,
    url,
    // Only claim a large image card when there's actually an image to show.
    card: image.imageUrl ? 'summary_large_image' : 'summary',
  }
}

/** Metadata for a route that isn't an image page (editor, gallery, or unknown). */
export function staticPageMeta(pathname: string, url: string): PageMeta {
  const base = { image: SITE.image, url, card: 'summary_large_image' as const }
  const p = pathname.replace(/\/+$/, '') || '/'

  if (p === '/gallery' || p.startsWith('/gallery/')) {
    const mine = p === '/gallery/mine'
    return {
      ...base,
      title: `Gallery — ${SITE.name}`,
      description: mine
        ? `Your ${SITE.name} images.`
        : `Browse images the community has made with ${SITE.name} — shader looks saved to the AT Protocol.`,
    }
  }

  if (p === '/image' || p.startsWith('/image/')) {
    // A neutral image-page fallback; the edge function and the client refine this
    // with the actual record once it resolves.
    return { ...base, title: `${SITE.name} image`, description: SITE.description }
  }

  // Editor / landing / anything else.
  return {
    ...base,
    title: `${SITE.name} — edit photos with live shader looks`,
    description: SITE.description,
  }
}

/**
 * Render a PageMeta as the head markup (title + description + Open Graph + Twitter
 * Card). Used by the edge function to inject server-side; the client sets the same
 * fields on live DOM nodes. All interpolated values are HTML-escaped.
 */
export function renderMetaTags(meta: PageMeta): string {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const image = escapeHtml(meta.image)
  const url = escapeHtml(meta.url)
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="${meta.card}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ')
}
