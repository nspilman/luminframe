import { useEffect } from 'react'
import { PageMeta, SITE } from '@/lib/pageMeta'

/** Find-or-create a head <meta> by its name/property, and set its content. */
function upsertMeta(kind: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(kind, key)
    document.head.appendChild(el)
  }
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
  useEffect(() => {
    if (!meta) return
    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    upsertMeta('property', 'og:site_name', SITE.name)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', meta.url)
    upsertMeta('property', 'og:image', meta.image)
    upsertMeta('name', 'twitter:card', meta.card)
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', meta.image)
  }, [meta?.title, meta?.description, meta?.image, meta?.url, meta?.card])
}
