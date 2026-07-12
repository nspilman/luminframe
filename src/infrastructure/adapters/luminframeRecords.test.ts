import { buildLuminframeImageRecord } from './luminframeRecords'
import type { BlobRef } from '@atproto/api'

// The builder only places the blob by reference and never inspects it, so a
// stand-in keeps the test off the multiformats/CID machinery a real BlobRef
// would drag in.
const blob = { ref: 'fake-blob' } as unknown as BlobRef
const ISO = '2026-01-01T00:00:00.000Z'

describe('buildLuminframeImageRecord', () => {
  it('builds a com.luminframe.image with the blob and aspect ratio', () => {
    const record = buildLuminframeImageRecord({
      blob,
      aspectRatio: { width: 1600, height: 900 },
      createdAt: ISO,
    })

    expect(record).toEqual({
      $type: 'com.luminframe.image',
      image: blob,
      aspectRatio: { width: 1600, height: 900 },
      createdAt: ISO,
    })
  })

  it('records the effect recipe when effects are given', () => {
    const record = buildLuminframeImageRecord({
      blob,
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
      effects: ['kaleidoscope', 'vignette'],
    })

    expect(record.effects).toEqual(['kaleidoscope', 'vignette'])
  })

  it('omits effects entirely when the recipe is empty', () => {
    // An empty array is noise in the repo — a record with no effects should have
    // no `effects` field, not `effects: []`.
    const record = buildLuminframeImageRecord({
      blob,
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
      effects: [],
    })

    expect('effects' in record).toBe(false)
  })

  it('trims and attaches alt and title, dropping blank ones', () => {
    const record = buildLuminframeImageRecord({
      blob,
      aspectRatio: { width: 1, height: 1 },
      createdAt: ISO,
      alt: '  a misty forest  ',
      title: '   ',
    })

    expect(record.alt).toBe('a misty forest')
    expect('title' in record).toBe(false)
  })
})
