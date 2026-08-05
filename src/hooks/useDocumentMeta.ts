import { useEffect } from 'react'
import { PageMeta, metaTags } from '@/lib/pageMeta'

/** Marks the tags this hook owns, so it can clear the ones a page no longer wants. */
const OWNED = 'data-lf-meta'

/** Find-or-create a head <meta> by its name/property, and set its content. */
function upsertMeta(kind: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(kind, key)
    document.head.appendChild(el)
  }
  el.setAttribute(OWNED, '')
  el.setAttribute('content', content)
}

/**
 * Keep the document head in sync with the current page's metadata: the tab title,
 * description, and Open Graph / Twitter Card tags. This is the in-browser half of
 * share metadata — it fixes tab titles and unfurls for crawlers that run JS. The
 * non-JS crawlers are served the same tags by the edge function; both read from
 * the one source of truth in pageMeta.ts.
 *
 * Pass null to leave the head untouched — so a route with more than one candidate
 * writer (the image page refines what the shell set) can defer to the owner.
 */
export function useDocumentMeta(meta: PageMeta | null): void {
  // The tag set is the dependency: some tags are conditional (video, image
  // size), so keying on a fixed list of PageMeta fields would go stale the next
  // time one is added.
  const tags = meta ? metaTags(meta) : null
  const signature = tags ? JSON.stringify(tags) : null

  useEffect(() => {
    if (!meta || !tags) return
    document.title = meta.title
    const wanted = new Set(tags.map((t) => `${t.kind}:${t.key}`))
    // Clear what this page doesn't want. Upserting alone would leave the
    // previous page's conditional tags behind — a still would keep claiming the
    // og:video of the animated edit viewed before it.
    for (const el of document.head.querySelectorAll<HTMLMetaElement>(`meta[${OWNED}]`)) {
      const kind = el.hasAttribute('property') ? 'property' : 'name'
      const key = el.getAttribute(kind)
      if (!key || !wanted.has(`${kind}:${key}`)) el.remove()
    }
    for (const tag of tags) upsertMeta(tag.kind, tag.key, tag.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature covers tags
  }, [signature])
}
