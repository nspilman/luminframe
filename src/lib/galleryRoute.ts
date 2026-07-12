/**
 * The mapping between a URL and the gallery's place within it. The gallery lives
 * at /gallery (network scope) and /gallery/mine (the signed-in user's scope); the
 * scope is a path segment because it's a genuine sub-place. The open image is a
 * ?image=<at-uri> query param — a transient focus laid *over* a scope, not a place
 * of its own — so the gallery stays addressable underneath it.
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
 * The search-param key that asks the editor to open a network image as its
 * source — a "remix." Like the others, it lives in the URL so the action is a
 * plain link (and a shared /?remix=<uri> works for anyone).
 */
export const REMIX_PARAM = 'remix'

/** The editor address that loads a given image (by AT-URI) as the working source. */
export function editorRemixPath(uri: string): string {
  return `/?${REMIX_PARAM}=${encodeURIComponent(uri)}`
}
