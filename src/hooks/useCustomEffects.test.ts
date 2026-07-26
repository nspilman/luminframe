import { buildCustomEffectEntries } from './useCustomEffects'
import { buildEffectRecord } from '@/effects-contract'

/**
 * The pure record→entries pipeline. The valid case deliberately feeds a record
 * built by buildEffectRecord — the write and read directions of the contract
 * meeting in one test, the same guarantee the publish script and the app rely
 * on in production.
 */

const validRecord = buildEffectRecord(
  {
    name: 'Invert',
    description: 'Flip every color',
    env: 1,
    params: [{ type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 }],
    body: 'void main() { gl_FragColor = vec4(1.0 - texture2D(imageTexture, vUv).rgb * amount, 1.0); }',
  },
  '2026-07-26T00:00:00.000Z'
)

describe('buildCustomEffectEntries', () => {
  it('turns a valid record into an entry keyed by its AT-URI', () => {
    const { entries, skipped } = buildCustomEffectEntries(
      [{ uri: 'at://did:plc:x/com.luminframe.effect/invert', value: validRecord }],
      () => ({ status: 'ok' })
    )
    expect(skipped).toEqual([])
    expect(entries).toHaveLength(1)
    expect(entries[0].key).toBe('at://did:plc:x/com.luminframe.effect/invert')
    expect(entries[0].effect.name).toBe('Invert')
    expect(entries[0].description).toBe('Flip every color')
  })

  it('skips an invalid record with its parse errors', () => {
    const { entries, skipped } = buildCustomEffectEntries(
      [{ uri: 'at://bad', value: { name: 'X' } }],
      () => ({ status: 'ok' })
    )
    expect(entries).toEqual([])
    expect(skipped[0].uri).toBe('at://bad')
    expect(skipped[0].reasons.length).toBeGreaterThan(0)
  })

  it('skips an effect whose GLSL fails to compile, carrying the log', () => {
    const { entries, skipped } = buildCustomEffectEntries(
      [{ uri: 'at://broken', value: validRecord }],
      () => ({ status: 'failed', log: 'ERROR: 0:12: undeclared identifier' })
    )
    expect(entries).toEqual([])
    expect(skipped[0].reasons).toEqual(['GLSL failed to compile: ERROR: 0:12: undeclared identifier'])
  })

  it('does not skip when the compile check is unavailable', () => {
    // Pins the degrade path: environments without WebGL must not empty the library.
    const { entries } = buildCustomEffectEntries(
      [{ uri: 'at://ok', value: validRecord }],
      () => ({ status: 'unavailable' })
    )
    expect(entries).toHaveLength(1)
  })

  it('one bad record does not take down its neighbors', () => {
    const { entries, skipped } = buildCustomEffectEntries(
      [
        { uri: 'at://bad', value: 'garbage' },
        { uri: 'at://good', value: validRecord },
      ],
      () => ({ status: 'ok' })
    )
    expect(entries.map((e) => e.key)).toEqual(['at://good'])
    expect(skipped.map((s) => s.uri)).toEqual(['at://bad'])
  })
})
