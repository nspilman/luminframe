import { toBlueskyUrl, toGrainUrl, toLuminframeUrl, publicUrlFor } from './publishUrls'

const BSKY = 'at://did:plc:abc/app.bsky.feed.post/3kpostkey'
const GRAIN = 'at://did:plc:abc/social.grain.gallery/3kgallerykey'
const LUM = 'at://did:plc:abc/com.luminframe.image/3kimagekey'

describe('toBlueskyUrl', () => {
  it('builds a profile/post URL from the handle and the URI rkey', () => {
    expect(toBlueskyUrl(BSKY, 'alice.bsky.social')).toBe(
      'https://bsky.app/profile/alice.bsky.social/post/3kpostkey'
    )
  })

  it('falls back to the DID from the URI when no handle is given', () => {
    // Signed-in handle can briefly lag; the DID (uri segment 2) still resolves.
    expect(toBlueskyUrl(BSKY, null)).toBe(
      'https://bsky.app/profile/did:plc:abc/post/3kpostkey'
    )
  })
})

describe('toGrainUrl', () => {
  it('builds a profile/gallery URL from the DID and rkey in the URI', () => {
    expect(toGrainUrl(GRAIN)).toBe(
      'https://grain.social/profile/did:plc:abc/gallery/3kgallerykey'
    )
  })
})

describe('toLuminframeUrl', () => {
  it('links the record on pdsls.dev', () => {
    expect(toLuminframeUrl(LUM)).toBe('https://pdsls.dev/' + LUM)
  })

  it('returns null for a non-at:// string', () => {
    expect(toLuminframeUrl('https://example.com')).toBeNull()
  })
})

describe('publicUrlFor', () => {
  it('dispatches bluesky to the bsky.app URL', () => {
    expect(publicUrlFor('bluesky', BSKY, 'alice.bsky.social')).toBe(
      'https://bsky.app/profile/alice.bsky.social/post/3kpostkey'
    )
  })

  it('dispatches grain to the grain.social URL', () => {
    expect(publicUrlFor('grain', GRAIN, null)).toBe(
      'https://grain.social/profile/did:plc:abc/gallery/3kgallerykey'
    )
  })

  it('dispatches luminframe to the pdsls.dev URL', () => {
    expect(publicUrlFor('luminframe', LUM, null)).toBe('https://pdsls.dev/' + LUM)
  })
})
