/**
 * How a LuminframeImageView presents its fields — the single home for the display
 * projection shared by the gallery grid and the lightbox. Both render the same
 * facts (effect names, date, the author's profile link, the record link); keeping
 * that projection in one place is what stops the two views from drifting apart.
 */

import { LuminframeImageView } from '@/infrastructure/atproto/luminframeFeed'
import { shaderLibrary } from '@/lib/shaders'
import { ShaderType } from '@/types/shader'

/**
 * Display name for an effect key, falling back to the raw key. The fallback is
 * load-bearing here (unlike effect-picker's direct `shaderLibrary[type].name`):
 * gallery keys come from untrusted network records and may name an effect this
 * build doesn't know.
 */
export function effectLabel(key: string): string {
  return shaderLibrary[key as ShaderType]?.name ?? key
}

/** An ISO timestamp as a locale date, or '' if absent/unparseable. */
export function formatDate(iso: string, style: 'short' | 'medium' = 'short'): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { dateStyle: style })
}

/** The author's Bluesky profile, keyed by handle when resolved, else by DID. */
export function bskyProfileUrl(image: LuminframeImageView): string {
  return `https://bsky.app/profile/${image.handle ?? image.did}`
}

/** The record's page on pdsls.dev — the raw AT-URI view. */
export function pdslsUrl(image: LuminframeImageView): string {
  return `https://pdsls.dev/${image.uri}`
}
