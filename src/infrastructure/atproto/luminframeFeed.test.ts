import { getBlobUrl, parseIdentity, parseAtUri, recordToView } from './luminframeFeed'

describe('parseAtUri', () => {
  it('splits an at:// URI into did, collection, and rkey', () => {
    expect(parseAtUri('at://did:plc:abc/com.luminframe.image/3krecordkey')).toEqual({
      did: 'did:plc:abc',
      collection: 'com.luminframe.image',
      rkey: '3krecordkey',
    })
  })

  it('returns null when the scheme is not at://', () => {
    expect(parseAtUri('https://did:plc:abc/com.luminframe.image/x')).toBeNull()
  })

  it('returns null when a segment is missing', () => {
    // A collection with no rkey is not addressable to a single record.
    expect(parseAtUri('at://did:plc:abc/com.luminframe.image')).toBeNull()
  })
})

describe('getBlobUrl', () => {
  it('builds a getBlob URL with encoded did and cid', () => {
    expect(getBlobUrl('https://pds.example', 'did:plc:abc', 'bafyxyz')).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafyxyz'
    )
  })
})

describe('parseIdentity', () => {
  it('reads the PDS endpoint and handle from a DID document', () => {
    const identity = parseIdentity({
      alsoKnownAs: ['at://alice.bsky.social'],
      service: [
        { id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' },
      ],
    })
    expect(identity).toEqual({ pds: 'https://pds.example', handle: 'alice.bsky.social' })
  })

  it('returns nulls when the document has no PDS service or handle', () => {
    expect(parseIdentity({})).toEqual({ pds: null, handle: null })
  })
})

describe('recordToView', () => {
  const record = {
    uri: 'at://did:plc:abc/com.luminframe.image/3krecordkey',
    value: {
      image: { ref: { $link: 'bafblob' } },
      aspectRatio: { width: 1600, height: 900 },
      alt: 'a misty forest',
      title: 'Forest',
      effects: ['kaleidoscope', 'vignette'],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }

  it('maps a record to a view with the blob URL built from its image CID', () => {
    const view = recordToView(record, 'did:plc:abc', 'https://pds.example', 'alice.bsky.social')
    expect(view).toEqual({
      uri: 'at://did:plc:abc/com.luminframe.image/3krecordkey',
      rkey: '3krecordkey',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
      imageUrl: 'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafblob',
      aspectRatio: { width: 1600, height: 900 },
      alt: 'a misty forest',
      title: 'Forest',
      effects: ['kaleidoscope', 'vignette'],
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('yields a null imageUrl when the record carries no blob', () => {
    // A malformed/blobless record must not crash the grid — it just has no image.
    const view = recordToView({ uri: 'at://did:plc:abc/com.luminframe.image/x', value: {} }, 'did:plc:abc', 'https://pds.example', null)
    expect(view.imageUrl).toBeNull()
    expect(view.aspectRatio).toEqual({ width: 1, height: 1 })
    expect(view.effects).toEqual([])
  })

  it('drops non-string entries from effects', () => {
    const view = recordToView(
      { uri: 'at://x/y/z', value: { effects: ['ok', 42, null] as unknown[] } as never },
      'did:plc:abc',
      'https://pds.example',
      null
    )
    expect(view.effects).toEqual(['ok'])
  })
})
