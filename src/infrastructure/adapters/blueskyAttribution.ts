import type { Facet } from '@atproto/api'

const ATTRIBUTION_TEXT = 'made in the Atmosphere in luminframe.com'
const ATTRIBUTION_LINK_LABEL = 'luminframe.com'
const ATTRIBUTION_LINK_URI = 'https://luminframe.com'

/**
 * UTF-8 byte length — atproto facet offsets are byte offsets, not JS char
 * indices. Computed with a code-point loop (not TextEncoder) so it's pure and
 * env-independent: `for…of` iterates Unicode code points, handling surrogate
 * pairs, and each maps to its UTF-8 width.
 */
function utf8Length(text: string): number {
  let bytes = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
  }
  return bytes
}

/**
 * Append the Luminframe attribution line to a post caption and return the link
 * facet that makes `luminframe.com` clickable.
 *
 * The facet index is in UTF-8 byte offsets (per the protocol), so it's computed
 * by encoding the slice up to the label — not by character index, which would be
 * wrong the moment a caption contains any multi-byte character (emoji, accents).
 * Because the attribution is appended *after* the caption, any facets already
 * detected in the caption keep their offsets and can be concatenated with this one.
 */
export function appendAttribution(caption: string): { text: string; facet: Facet } {
  const separator = caption ? '\n\n' : ''
  const text = `${caption}${separator}${ATTRIBUTION_TEXT}`

  const labelCharStart =
    caption.length + separator.length + ATTRIBUTION_TEXT.indexOf(ATTRIBUTION_LINK_LABEL)
  const byteStart = utf8Length(text.slice(0, labelCharStart))
  const byteEnd = byteStart + utf8Length(ATTRIBUTION_LINK_LABEL)

  const facet: Facet = {
    index: { byteStart, byteEnd },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: ATTRIBUTION_LINK_URI }],
  }

  return { text, facet }
}
