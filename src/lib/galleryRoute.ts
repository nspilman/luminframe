/**
 * The app's URL vocabulary — every place mapped to an address, and back.
 *
 *   /                     the editor
 *   /gallery              the gallery, network scope
 *   /gallery/mine         the gallery, the signed-in user's scope
 *   /image/:did/:rkey     one image's canonical page (its home)
 *   …?image=<at-uri>      an image opened as a quick preview over the gallery
 *   /?remix=<at-uri>      the editor, loading that image as its source
 *
 * The gallery scope is a path segment (a genuine sub-place); the quick-preview
 * image and the remix are query params (transient focuses over a place). An
 * image's canonical page is a place of its own — the thing you share.
 *
 * Pure so the address↔state translation has one tested home and a typo can't
 * silently send a link to the wrong place.
 */

import { FeedTab } from '@/hooks/useLuminframeFeed'

export const GALLERY_ROOT = '/gallery'
const MINE_PATH = '/gallery/mine'

/** The gallery scope a path addresses. Anything under /gallery that isn't /mine is network. */
export function tabFromPath(pathname: string): FeedTab {
  return pathname.replace(/\/$/, '') === MINE_PATH ? 'mine' : 'network'
}

/** The canonical path for a scope — network's home is bare /gallery. */
export function pathForTab(tab: FeedTab): string {
  return tab === 'mine' ? MINE_PATH : GALLERY_ROOT
}

/** True when a path addresses the gallery (either scope). */
export function isGalleryPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '')
  return p === GALLERY_ROOT || p.startsWith(GALLERY_ROOT + '/')
}

/** The search-param key under which the open image's AT-URI travels. */
export const IMAGE_PARAM = 'image'

/**
 * The search-param key that narrows the gallery to one effect family — the "look."
 * Like the open image, it's a query param (a transient focus over the gallery
 * place, not a place of its own), so a filtered view is a shareable address:
 * /gallery?family=texture. Its value is an EffectCategory id (see catalog.ts).
 */
export const FAMILY_PARAM = 'family'

/**
 * The search-param key that asks the editor to open a network image as its
 * source — a "remix." Like the others, it lives in the URL so the action is a
 * plain link (and a shared /?remix=<uri> works for anyone).
 */
export const REMIX_PARAM = 'remix'

/** The editor address that loads a given image (by AT-URI) as the working source. */
export function editorRemixPath(uri: string): string {
  return `/?${REMIX_PARAM}=${encodeURIComponent(uri)}`
}

/**
 * The search-param key that asks the editor to apply a record's saved recipe (its
 * effect stack) to the current image — the "use this look as a filter" address.
 */
export const RECIPE_PARAM = 'recipe'

/** The editor address that applies a given record's recipe to the working image. */
export function editorApplyRecipePath(uri: string): string {
  return `/?${RECIPE_PARAM}=${encodeURIComponent(uri)}`
}

const IMAGE_PAGE_PREFIX = '/image'

/** The canonical page for one image, keyed by its author DID and record key. */
export function imagePagePath(did: string, rkey: string): string {
  return `${IMAGE_PAGE_PREFIX}/${encodeURIComponent(did)}/${encodeURIComponent(rkey)}`
}

/** The did + rkey addressed by an image-page path, or null if it isn't one. */
export function parseImagePath(pathname: string): { did: string; rkey: string } | null {
  const match = pathname.replace(/\/$/, '').match(/^\/image\/([^/]+)\/([^/]+)$/)
  if (!match) return null
  return { did: decodeURIComponent(match[1]), rkey: decodeURIComponent(match[2]) }
}

/** True when a path addresses an image page. */
export function isImagePath(pathname: string): boolean {
  return parseImagePath(pathname) !== null
}
