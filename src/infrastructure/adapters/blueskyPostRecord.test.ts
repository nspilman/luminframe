import { buildImagePostRecord } from './blueskyPostRecord'
import type { BlobRef, Facet } from '@atproto/api'

// The builder only ever places these by reference and never inspects them, so
// stand-ins are enough — and keep the test off the multiformats/CID machinery a
// real BlobRef would drag in.
const blob = { ref: 'fake-blob' } as unknown as BlobRef
const ISO = '2026-01-01T00:00:00.000Z'

describe('buildImagePostRecord', () => {
  it('wraps the blob as a single app.bsky.embed.images entry', () => {
    const record = buildImagePostRecord({
      blob,
      alt: 'a misty forest',
      text: '',
      aspectRatio: { width: 1600, height: 900 },
      createdAt: ISO,
    })

    expect(record.embed).toEqual({
      $type: 'app.bsky.embed.images',
      images: [
        { image: blob, alt: 'a misty forest', aspectRatio: { width: 1600, height: 900 } },
      ],
    })
  })

  it('carries the caption text and attaches detected facets', () => {
    const facets = [
      { index: { byteStart: 0, byteEnd: 5 }, features: [] },
    ] as unknown as Facet[]

    const record = buildImagePostRecord({
      blob,
      alt: 'x',
      text: 'hello',
      facets,
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
    })

    expect(record.text).toBe('hello')
    expect(record.facets).toBe(facets)
  })

  it('omits the facets field when none are detected', () => {
    const record = buildImagePostRecord({
      blob,
      alt: 'x',
      text: 'hello',
      facets: [],
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
    })

    expect(record).not.toHaveProperty('facets')
  })

  it('defaults the post language to English', () => {
    const record = buildImagePostRecord({
      blob,
      alt: 'x',
      text: '',
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
    })

    expect(record.langs).toEqual(['en'])
  })
})
