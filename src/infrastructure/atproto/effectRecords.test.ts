import { fetchRepoEffectRecords } from './effectRecords'

// The identity step is luminframeFeed's (tested there); here it's mocked so
// these tests pin only this module's own behavior: URL shape and the
// everything-fails-to-empty posture.
jest.mock('./luminframeFeed', () => ({
  resolveIdentity: jest.fn(async () => ({ pds: 'https://pds.example', handle: 'user.example' })),
}))

const mockFetch = (response: Partial<Response>) => {
  const fn = jest.fn(async (_url: string) => response as Response)
  global.fetch = fn as unknown as typeof fetch
  return fn
}

describe('fetchRepoEffectRecords', () => {
  afterEach(() => jest.restoreAllMocks())

  it('lists the effect collection from the resolved PDS', async () => {
    const fn = mockFetch({ ok: true, json: async () => ({ records: [{ uri: 'at://x', value: {} }] }) })
    const records = await fetchRepoEffectRecords('did:plc:abc')
    expect(fn.mock.calls[0][0]).toBe(
      'https://pds.example/xrpc/com.atproto.repo.listRecords?repo=did%3Aplc%3Aabc&collection=com.luminframe.effect&limit=100'
    )
    expect(records).toEqual([{ uri: 'at://x', value: {} }])
  })

  it('non-OK response → empty list', async () => {
    mockFetch({ ok: false })
    expect(await fetchRepoEffectRecords('did:plc:abc')).toEqual([])
  })

  it('malformed payload → empty list', async () => {
    mockFetch({ ok: true, json: async () => ({ records: 'nope' }) })
    expect(await fetchRepoEffectRecords('did:plc:abc')).toEqual([])
  })

  it('network error → empty list', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    expect(await fetchRepoEffectRecords('did:plc:abc')).toEqual([])
  })
})
