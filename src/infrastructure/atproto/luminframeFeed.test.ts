import { getBlobUrl, parseIdentity, parseAtUri, recordToView, walkAncestry } from './luminframeFeed'

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
    cid: 'bafrecordcid',
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
      cid: 'bafrecordcid',
      rkey: '3krecordkey',
      did: 'did:plc:abc',
      handle: 'alice.bsky.social',
      imageUrl: 'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafblob',
      aspectRatio: { width: 1600, height: 900 },
      alt: 'a misty forest',
      title: 'Forest',
      effects: ['kaleidoscope', 'vignette'],
      remixOf: undefined,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('reads the recipe, keeping only steps with a string type', () => {
    const view = recordToView(
      {
        uri: 'at://x/y/z',
        cid: 'c',
        value: {
          recipe: [
            { type: 'vibrance', params: { amount: 0.4 } },
            { type: 'blackAndWhite' },
            { params: { amount: 1 } }, // no type — dropped
          ],
        } as never,
      },
      'did:plc:abc',
      'https://pds.example',
      null
    )
    expect(view.recipe).toEqual([
      { type: 'vibrance', params: { amount: 0.4 } },
      { type: 'blackAndWhite' },
    ])
  })

  it('leaves recipe undefined when the record has none', () => {
    const view = recordToView({ uri: 'at://x/y/z', cid: 'c', value: {} }, 'did:plc:abc', 'https://pds.example', null)
    expect(view.recipe).toBeUndefined()
  })

  it('reads remixOf as a strong ref when present, and ignores a malformed one', () => {
    const parent = { uri: 'at://did:plc:xyz/com.luminframe.image/parent', cid: 'bafparent' }
    const withRef = recordToView(
      { uri: 'at://x/y/z', cid: 'c', value: { remixOf: parent } as never },
      'did:plc:abc',
      'https://pds.example',
      null
    )
    expect(withRef.remixOf).toEqual(parent)

    const malformed = recordToView(
      { uri: 'at://x/y/z', cid: 'c', value: { remixOf: { uri: 'only-uri' } } as never },
      'did:plc:abc',
      'https://pds.example',
      null
    )
    expect(malformed.remixOf).toBeUndefined()
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

// walkAncestry is the guard against a remix chain hanging the image page. The
// cases are its four ways to stop: the root, a dead link, the depth cap, and a
// cycle. A fake parent-map stands in for the network.
describe('walkAncestry', () => {
  // parents: child uri → { node label, that node's own parent uri }
  const fetchFrom = (parents: Record<string, { node: string; parentUri?: string }>) =>
    async (uri: string) => parents[uri] ?? null

  it('returns the chain oldest-first, excluding the starting record', async () => {
    // this ← B ← A(root). Start's first parent is B; B's parent is A; A has none.
    const chain = await walkAncestry('B', fetchFrom({
      B: { node: 'B', parentUri: 'A' },
      A: { node: 'A' },
    }))
    expect(chain).toEqual(['A', 'B'])
  })

  it('is empty when there is no parent', async () => {
    expect(await walkAncestry(undefined, fetchFrom({}))).toEqual([])
  })

  it('stops at a dead link (a parent that no longer resolves)', async () => {
    // B resolves; its parent 'gone' does not — the chain ends at B.
    const chain = await walkAncestry('B', fetchFrom({ B: { node: 'B', parentUri: 'gone' } }))
    expect(chain).toEqual(['B'])
  })

  it('breaks a cycle instead of looping forever', async () => {
    // A ↔ B point at each other. Starting at A: visit A, then B, then A is seen → stop.
    const chain = await walkAncestry('A', fetchFrom({
      A: { node: 'A', parentUri: 'B' },
      B: { node: 'B', parentUri: 'A' },
    }))
    expect(chain).toEqual(['B', 'A']) // reversed from visit order [A, B]
  })

  it('stops at the depth cap', async () => {
    // A 6-long chain n5←n4←…←n0, capped at 3 → only the 3 nearest visited.
    const parents: Record<string, { node: string; parentUri?: string }> = {}
    for (let i = 5; i > 0; i--) parents[`n${i}`] = { node: `n${i}`, parentUri: `n${i - 1}` }
    parents.n0 = { node: 'n0' }
    const chain = await walkAncestry('n5', fetchFrom(parents), 3)
    expect(chain).toEqual(['n3', 'n4', 'n5']) // visited n5,n4,n3 then reversed
  })
})
