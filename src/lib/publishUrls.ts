/**
 * Where an image goes when you save, and how each destination's AT-URI maps to a
 * human web URL. Saving always writes the canonical PDS record (`luminframe`);
 * the social networks are opt-in cross-posts alongside it.
 *
 * The URL builders are pure and tested — they parse AT-URIs by hand, exactly the
 * kind of `split('/')` indexing where an off-by-one silently points a "View
 * your post" link at nothing.
 */

/** An opt-in cross-post destination, written in addition to the PDS save. */
export type ShareTarget = 'bluesky' | 'grain'

/** Everywhere a save can land: the always-on PDS record plus the optional shares. */
export type PublishTarget = 'luminframe' | ShareTarget

/** at://{did}/app.bsky.feed.post/{rkey} → https://bsky.app/profile/{actor}/post/{rkey} */
export function toBlueskyUrl(uri: string, actor: string | null): string | null {
  const rkey = uri.split('/').pop()
  if (!rkey) return null
  return `https://bsky.app/profile/${actor ?? uri.split('/')[2]}/post/${rkey}`
}

/**
 * at://{did}/social.grain.gallery/{rkey} → https://grain.social/profile/{did}/gallery/{rkey}
 * Grain's gallery route takes the DID directly, so no handle lookup is needed.
 */
export function toGrainUrl(uri: string): string | null {
  const parts = uri.split('/')
  const did = parts[2]
  const rkey = parts[parts.length - 1]
  if (!did || !rkey) return null
  return `https://grain.social/profile/${did}/gallery/${rkey}`
}

/**
 * A com.luminframe.image record has no first-party viewer URL of its own yet, so
 * we link to pdsls.dev — a generic AT Protocol record browser — so the user can
 * see the record they just wrote.
 */
export function toLuminframeUrl(uri: string): string | null {
  if (!uri.startsWith('at://')) return null
  return `https://pdsls.dev/${uri}`
}

/** The public web URL for a created record, dispatched by its destination. */
export function publicUrlFor(target: PublishTarget, uri: string, handle: string | null): string | null {
  switch (target) {
    case 'bluesky':
      return toBlueskyUrl(uri, handle)
    case 'grain':
      return toGrainUrl(uri)
    case 'luminframe':
      return toLuminframeUrl(uri)
  }
}
