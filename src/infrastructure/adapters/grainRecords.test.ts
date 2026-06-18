import {
  buildGrainPhotoRecord,
  buildGrainGalleryRecord,
  buildGrainItemRecord,
  deriveGalleryTitle,
  GRAIN_DEFAULT_GALLERY_TITLE,
} from './grainRecords'
import type { BlobRef, Facet } from '@atproto/api'

// The builders only place these by reference and never inspect them, so
// stand-ins keep the tests off the multiformats/CID machinery a real BlobRef
// would drag in.
const blob = { ref: 'fake-blob' } as unknown as BlobRef
const ISO = '2026-01-01T00:00:00.000Z'

describe('buildGrainPhotoRecord', () => {
  it('builds a social.grain.photo with the blob and aspect ratio', () => {
    const record = buildGrainPhotoRecord({
      blob,
      aspectRatio: { width: 1600, height: 900 },
      createdAt: ISO,
    })

    expect(record).toEqual({
      $type: 'social.grain.photo',
      photo: blob,
      aspectRatio: { width: 1600, height: 900 },
      createdAt: ISO,
    })
  })

  it('attaches alt text when provided', () => {
    const record = buildGrainPhotoRecord({
      blob,
      aspectRatio: { width: 1, height: 1 },
      alt: 'a misty forest',
      createdAt: ISO,
    })

    expect(record.alt).toBe('a misty forest')
  })

  it('omits alt when it is blank', () => {
    // alt is optional on Grain; writing an empty/whitespace string would put
    // meaningless data in the user's repo.
    const record = buildGrainPhotoRecord({
      blob,
      aspectRatio: { width: 1, height: 1 },
      alt: '   ',
      createdAt: ISO,
    })

    expect(record).not.toHaveProperty('alt')
  })
})

describe('buildGrainGalleryRecord', () => {
  it('builds a social.grain.gallery with the required title', () => {
    const record = buildGrainGalleryRecord({ title: 'My gallery', createdAt: ISO })

    expect(record).toEqual({
      $type: 'social.grain.gallery',
      title: 'My gallery',
      createdAt: ISO,
    })
  })

  it('attaches the description and its facets together', () => {
    const facets = [
      { index: { byteStart: 0, byteEnd: 5 }, features: [] },
    ] as unknown as Facet[]

    const record = buildGrainGalleryRecord({
      title: 't',
      description: 'made in the Atmosphere',
      facets,
      createdAt: ISO,
    })

    expect(record.description).toBe('made in the Atmosphere')
    expect(record.facets).toBe(facets)
  })

  it('omits facets when none are present', () => {
    // Facets annotate description text by byte offset — an empty array is noise.
    const record = buildGrainGalleryRecord({
      title: 't',
      description: 'plain text',
      facets: [],
      createdAt: ISO,
    })

    expect(record).not.toHaveProperty('facets')
  })

  it('omits the description when it is empty', () => {
    const record = buildGrainGalleryRecord({ title: 't', description: '', createdAt: ISO })

    expect(record).not.toHaveProperty('description')
  })
})

describe('buildGrainItemRecord', () => {
  it('joins the gallery and photo AT-URIs', () => {
    const record = buildGrainItemRecord({
      gallery: 'at://did:plc:abc/social.grain.gallery/g1',
      item: 'at://did:plc:abc/social.grain.photo/p1',
      createdAt: ISO,
    })

    expect(record).toEqual({
      $type: 'social.grain.gallery.item',
      gallery: 'at://did:plc:abc/social.grain.gallery/g1',
      item: 'at://did:plc:abc/social.grain.photo/p1',
      createdAt: ISO,
    })
  })

  it('omits position so the lexicon default of 0 stands', () => {
    const record = buildGrainItemRecord({
      gallery: 'at://g',
      item: 'at://p',
      createdAt: ISO,
    })

    expect(record).not.toHaveProperty('position')
  })
})

describe('deriveGalleryTitle', () => {
  it('falls back to the app name for a blank caption', () => {
    expect(deriveGalleryTitle('   \n  ')).toBe(GRAIN_DEFAULT_GALLERY_TITLE)
  })

  it('takes only the first line of a multi-line caption', () => {
    expect(deriveGalleryTitle('Sunset over the bay\nshot on the gravel ride')).toBe(
      'Sunset over the bay'
    )
  })

  it('keeps a title exactly at the 100-char cap intact', () => {
    // 100 chars in → 100 chars out, no ellipsis: the boundary the lexicon allows.
    const exactly100 = 'a'.repeat(100)
    expect(deriveGalleryTitle(exactly100)).toBe(exactly100)
  })

  it('cuts an over-long title to 100 chars including the ellipsis', () => {
    // 101 chars in → 99 chars + '…' = 100, so the write can't be rejected for length.
    const result = deriveGalleryTitle('a'.repeat(101))
    expect(result).toBe('a'.repeat(99) + '…')
  })
})
