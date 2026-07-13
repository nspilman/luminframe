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

/** One head meta tag: its selector kind (name/property) and its content. */
export interface MetaTag {
  kind: 'name' | 'property'
  key: string
  content: string
}

/**
 * The <meta> set for a page, as data — the single enumeration of what a page's
 * share tags are. Rendered two ways from here: renderMetaTags joins it into HTML
 * for the edge to inject, and useDocumentMeta upserts it onto live DOM nodes. The
 * <title> is handled alongside by each (it isn't a <meta>). Adding a tag is a
 * one-line change in one place.
 */
export function metaTags(meta: PageMeta): MetaTag[] {
  return [
    { kind: 'name', key: 'description', content: meta.description },
    { kind: 'property', key: 'og:site_name', content: SITE.name },
    { kind: 'property', key: 'og:title', content: meta.title },
    { kind: 'property', key: 'og:description', content: meta.description },
    { kind: 'property', key: 'og:type', content: 'website' },
    { kind: 'property', key: 'og:url', content: meta.url },
    { kind: 'property', key: 'og:image', content: meta.image },
    { kind: 'name', key: 'twitter:card', content: meta.card },
    { kind: 'name', key: 'twitter:title', content: meta.title },
    { kind: 'name', key: 'twitter:description', content: meta.description },
    { kind: 'name', key: 'twitter:image', content: meta.image },
  ]
}

/**
 * Render a PageMeta as head markup (title + the meta set from metaTags). Used by
 * the edge function to inject server-side; useDocumentMeta applies the same set to
 * live DOM. All interpolated values are HTML-escaped — record text is untrusted.
 */
export function renderMetaTags(meta: PageMeta): string {
  const tags = metaTags(meta).map(
    (t) => `<meta ${t.kind}="${t.key}" content="${escapeHtml(t.content)}" />`
  )
  return [`<title>${escapeHtml(meta.title)}</title>`, ...tags].join('\n    ')
}
