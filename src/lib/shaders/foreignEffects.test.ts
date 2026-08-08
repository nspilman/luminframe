import { buildEffectRecord } from '@/effects-contract'
import { shaderLibrary } from '@/lib/shaders'
import { foreignEffectEntries, registryWithForeign, resolveForeignEffects } from './foreignEffects'

const validValue = buildEffectRecord(
  {
    name: 'Warm Grain',
    env: 1,
    params: [{ type: 'range', name: 'amount', label: 'Amount', default: 0.5, min: 0, max: 1, step: 0.01 }],
    body: 'void main() { gl_FragColor = texture2D(imageTexture, vUv); }',
  },
  '2026-07-26T00:00:00.000Z'
)

const URI_OK = 'at://did:plc:other/com.luminframe.effect/warm-grain'
const URI_BAD = 'at://did:plc:other/com.luminframe.effect/broken'
const URI_GONE = 'at://did:plc:other/com.luminframe.effect/gone'

describe('resolveForeignEffects', () => {
  it('resolves a valid record into the foreign registry, fetching it once', async () => {
    const fetchRecord = jest.fn(async (uri: string) => ({ uri, value: validValue }))
    await resolveForeignEffects([URI_OK], shaderLibrary, fetchRecord)
    await resolveForeignEffects([URI_OK], shaderLibrary, fetchRecord)

    expect(fetchRecord).toHaveBeenCalledTimes(1)
    expect(registryWithForeign(shaderLibrary)[URI_OK]?.name).toBe('Warm Grain')
  })

  it('names the reasons for a record that fails the grammar', async () => {
    const fetchRecord = jest.fn(async (uri: string) => ({ uri, value: { name: 'Nope' } }))
    const { unresolved } = await resolveForeignEffects([URI_BAD], shaderLibrary, fetchRecord)

    expect(unresolved).toHaveLength(1)
    expect(unresolved[0].key).toBe(URI_BAD)
    expect(unresolved[0].reasons.length).toBeGreaterThan(0)
  })

  it('a missing record → unresolved with the not-found reason', async () => {
    const fetchRecord = jest.fn(async () => null)
    const { unresolved } = await resolveForeignEffects([URI_GONE], shaderLibrary, fetchRecord)

    expect(unresolved).toEqual([
      { key: URI_GONE, reasons: ['record not found (deleted, or its PDS is unreachable)'] },
    ])
  })

  it('does not fetch builtin keys or keys the registry already holds', async () => {
    const fetchRecord = jest.fn(async (uri: string) => ({ uri, value: validValue }))
    await resolveForeignEffects(['sepia', 'blur'], shaderLibrary, fetchRecord)

    expect(fetchRecord).not.toHaveBeenCalled()
  })

  it('resolved entries all carry at:// keys', () => {
    // foreignEffectEntries feeds the registry only — the picker's Yours
    // section reads `custom`, which this module never touches.
    expect(foreignEffectEntries().every((e) => e.key.startsWith('at://'))).toBe(true)
  })
})

describe('luminframe.com alias resolution', () => {
  const PIXELATE_URI = 'at://did:plc:5mo4amsmatgfmzpeqqsuetot/com.luminframe.effect/pixelate'
  const UNKNOWN_URI = 'at://did:plc:5mo4amsmatgfmzpeqqsuetot/com.luminframe.effect/from-the-future'

  it('resolves a published-builtin URI to the bundled effect without fetching', async () => {
    const fetchRecord = jest.fn()
    const { unresolved } = await resolveForeignEffects([PIXELATE_URI], shaderLibrary, fetchRecord)
    expect(unresolved).toEqual([])
    expect(fetchRecord).not.toHaveBeenCalled()
    const entry = foreignEffectEntries().find((e) => e.key === PIXELATE_URI)
    expect(entry?.effect).toBe(shaderLibrary.pixelate)
  })

  it('an unknown luminframe.com slug still fetches — newer effects may postdate this build', async () => {
    const fetchRecord = jest.fn().mockResolvedValue(null)
    await resolveForeignEffects([UNKNOWN_URI], shaderLibrary, fetchRecord)
    expect(fetchRecord).toHaveBeenCalledWith(UNKNOWN_URI)
  })
})
