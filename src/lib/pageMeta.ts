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
  /** og:type. 'video.other' is what makes a crawler honour the og:video tags. */
  type: 'website' | 'video.other'
  /** Alt text for the share image, when the record carried one. */
  imageAlt?: string
  /** The share image's pixel size, so a card can be laid out before it loads. */
  imageSize?: { width: number; height: number }
  /** Absolute URL of the looping mp4, for an animated edit. */
  videoUrl?: string
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
  /** Absolute getBlob URL of the looping clip, when the edit animates. */
  videoUrl?: string | null
  /** The render's pixel dimensions, from the record's aspectRatio. */
  width?: number
  height?: number
  /** The effect keys applied, in order — the record's `effects`. */
  effects?: readonly string[]
}

/** The AT-Protocol collection an image record lives in. */
const IMAGE_COLLECTION = 'com.luminframe.image'

/**
 * The image record a URL addresses, if any: its canonical page
 * (/image/:did/:rkey) or an image opened as a quick preview over some other
 * place (…?image=<at-uri>, how the gallery's lightbox addresses itself).
 *
 * One function so the edge injector and the client agree on which URLs belong
 * to an image — a quick-preview link is shared as readily as a canonical one
 * and has to unfurl with the same card.
 */
export function imageTargetFromUrl(
  pathname: string,
  search: string
): { did: string; rkey: string } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  const onPath = path.match(/^\/image\/([^/]+)\/([^/]+)$/)
  if (onPath) {
    return { did: decodeURIComponent(onPath[1]), rkey: decodeURIComponent(onPath[2]) }
  }
  const uri = new URLSearchParams(search).get('image')
  const parts = uri?.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/)
  return parts && parts[2] === IMAGE_COLLECTION ? { did: parts[1], rkey: parts[3] } : null
}

/**
 * Effect keys as display names: `filmGrain` → `Film Grain`. Custom effects are
 * at:// URIs, which carry no name a string transform could recover — naming
 * them would mean fetching each author's record, so they're left out of the
 * card rather than shown raw.
 */
function effectNames(keys: readonly string[] = []): string[] {
  return keys
    .filter((key) => !key.includes('://'))
    .map((key) =>
      key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    )
    .filter(Boolean)
}

/** "Made with Halftone, Film Grain, and 2 more." — empty when nothing is nameable. */
function madeWith(keys: readonly string[] | undefined): string {
  const names = effectNames(keys)
  if (names.length === 0) return ''
  const shown = names.slice(0, 3)
  const rest = names.length - shown.length
  return rest > 0
    ? `Made with ${shown.join(', ')}, and ${rest} more.`
    : `Made with ${shown.join(', ')}.`
}

/** Alt text is written as a phrase, not a sentence; give it an end before appending to it. */
function ended(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`
}

/**
 * Every crawler truncates long card text, and a record's alt may run to 2000
 * graphemes — cutting it here means the cut lands on a word and ends in an
 * ellipsis instead of mid-syllable wherever the reader's platform decides.
 */
function clamp(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'
}

/** Metadata for one image record — its own render is the card. */
export function imagePageMeta(image: ImageMetaInput, url: string): PageMeta {
  const by = image.handle ? ` by @${image.handle}` : ''
  const title = image.title
    ? `${clamp(image.title, 70)} — ${SITE.name}`
    : `${SITE.name} image${by}`

  const alt = image.alt?.trim()
  const made = madeWith(image.effects)
  const description = clamp(
    alt
      ? made
        ? `${ended(alt)} ${made}`
        : alt
      : made
        ? `A ${SITE.name} edit${by}. ${made}`
        : `An image edited with ${SITE.name}'s shader effects${by}.`,
    200
  )

  const hasImage = Boolean(image.imageUrl)
  return {
    title,
    description,
    image: image.imageUrl || SITE.image,
    url,
    // Only claim a large image card when there's actually an image to show.
    card: hasImage ? 'summary_large_image' : 'summary',
    // og:video is ignored unless og:type says the page is about a video; the
    // still remains the poster either way, so a stills-only crawler is fine.
    type: hasImage && image.videoUrl ? 'video.other' : 'website',
    imageAlt: alt,
    imageSize:
      hasImage && image.width && image.height
        ? { width: image.width, height: image.height }
        : undefined,
    videoUrl: (hasImage && image.videoUrl) || undefined,
  }
}

/** Metadata for a route that isn't an image page (editor, gallery, or unknown). */
export function staticPageMeta(pathname: string, url: string): PageMeta {
  const base = {
    image: SITE.image,
    url,
    card: 'summary_large_image' as const,
    type: 'website' as const,
  }
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

  if (p === '/create' || p.startsWith('/create/')) {
    return {
      ...base,
      title: `Shader Editor — ${SITE.name}`,
      description: `Write a shader effect and see it live on a test image — then publish it to your own repo on the AT Protocol.`,
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
  const tags: MetaTag[] = [
    { kind: 'name', key: 'description', content: meta.description },
    { kind: 'property', key: 'og:site_name', content: SITE.name },
    { kind: 'property', key: 'og:title', content: meta.title },
    { kind: 'property', key: 'og:description', content: meta.description },
    { kind: 'property', key: 'og:type', content: meta.type },
    { kind: 'property', key: 'og:url', content: meta.url },
    { kind: 'property', key: 'og:image', content: meta.image },
  ]
  if (meta.imageSize) {
    tags.push(
      { kind: 'property', key: 'og:image:width', content: String(meta.imageSize.width) },
      { kind: 'property', key: 'og:image:height', content: String(meta.imageSize.height) }
    )
  }
  if (meta.imageAlt) {
    tags.push({ kind: 'property', key: 'og:image:alt', content: meta.imageAlt })
  }
  if (meta.videoUrl) {
    tags.push(
      { kind: 'property', key: 'og:video', content: meta.videoUrl },
      { kind: 'property', key: 'og:video:secure_url', content: meta.videoUrl },
      { kind: 'property', key: 'og:video:type', content: 'video/mp4' }
    )
    if (meta.imageSize) {
      tags.push(
        { kind: 'property', key: 'og:video:width', content: String(meta.imageSize.width) },
        { kind: 'property', key: 'og:video:height', content: String(meta.imageSize.height) }
      )
    }
  }
  tags.push(
    { kind: 'name', key: 'twitter:card', content: meta.card },
    { kind: 'name', key: 'twitter:title', content: meta.title },
    { kind: 'name', key: 'twitter:description', content: meta.description },
    { kind: 'name', key: 'twitter:image', content: meta.image }
  )
  if (meta.imageAlt) {
    tags.push({ kind: 'name', key: 'twitter:image:alt', content: meta.imageAlt })
  }
  return tags
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
