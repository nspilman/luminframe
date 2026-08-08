import { buildCollectionRecord, parseCollectionRecord } from './collectionRecord'
import { MAX_COLLECTION_EFFECTS } from './constants'

const validWire = () =>
  buildCollectionRecord(
    { name: 'Featured', effectUris: ['at://did:plc:abc/com.luminframe.effect/pixelate'] },
    '2026-08-08T00:00:00.000Z'
  )

describe('parseCollectionRecord', () => {
  it('round-trips a built record', () => {
    const parsed = parseCollectionRecord(validWire())
    expect(parsed).toEqual({
      ok: true,
      def: { name: 'Featured', effectUris: ['at://did:plc:abc/com.luminframe.effect/pixelate'] },
    })
  })

  it('rejects a non-array effects field', () => {
    const parsed = parseCollectionRecord({ ...validWire(), effects: 'at://one' })
    expect(parsed.ok).toBe(false)
  })

  it('rejects an entry that is not an at:// URI', () => {
    const parsed = parseCollectionRecord({ ...validWire(), effects: ['https://example.com/x'] })
    expect(parsed.ok).toBe(false)
  })

  it('rejects a list over the cap', () => {
    const effects = Array.from({ length: MAX_COLLECTION_EFFECTS + 1 }, (_, i) => `at://did:plc:abc/com.luminframe.effect/e${i}`)
    const parsed = parseCollectionRecord({ ...validWire(), effects })
    expect(parsed.ok).toBe(false)
  })

  it('preserves the curator order', () => {
    const effects = ['at://did:plc:b/com.luminframe.effect/two', 'at://did:plc:a/com.luminframe.effect/one']
    const parsed = parseCollectionRecord({ ...validWire(), effects })
    expect(parsed.ok && parsed.def.effectUris).toEqual(effects)
  })
})
