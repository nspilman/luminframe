import { rekeyOfficialEntries } from './useOfficialEffects'
import { CustomEffectEntry } from './useCustomEffects'

/**
 * The re-key is what keeps every published recipe resolving: image records
 * name their steps with short keys, so canon entries must land under them.
 */

const entry = (key: string): CustomEffectEntry =>
  ({ key, effect: {}, def: {} }) as unknown as CustomEffectEntry

describe('rekeyOfficialEntries', () => {
  it('a known slug → its short builtin key', () => {
    const [rekeyed] = rekeyOfficialEntries([
      entry('at://did:plc:5mo4amsmatgfmzpeqqsuetot/com.luminframe.effect/black-and-white'),
    ])
    expect(rekeyed.key).toBe('blackAndWhite')
  })

  it('an unknown slug keeps its at:// key — an effect that postdates this build', () => {
    const uri = 'at://did:plc:5mo4amsmatgfmzpeqqsuetot/com.luminframe.effect/from-the-future'
    expect(rekeyOfficialEntries([entry(uri)])[0].key).toBe(uri)
  })
})
