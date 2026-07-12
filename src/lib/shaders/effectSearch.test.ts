import { subsequenceMatch, effectMatchesQuery, filterEffectFamilies } from './effectSearch'
import { effectFamilies } from './catalog'

// subsequenceMatch is the whole matching rule: query chars in order, any gaps.
describe('subsequenceMatch', () => {
  it('matches when query chars appear in order', () => {
    // k…l…d all appear in Kaleidoscope in that order, though not adjacent.
    expect(subsequenceMatch('kld', 'Kaleidoscope')).toBe(true)
  })

  it('does not match when query chars are out of order', () => {
    // 'oe' cannot be a subsequence of 'Echo' — 'o' comes after 'e' there.
    expect(subsequenceMatch('oe', 'Echo')).toBe(false)
  })

  it('does not match when a query char is absent', () => {
    expect(subsequenceMatch('ez', 'Echo')).toBe(false)
  })

  it('ignores case on both sides', () => {
    expect(subsequenceMatch('KAL', 'Kaleidoscope')).toBe(true)
  })
})

// effectMatchesQuery searches both the name and the plain-speech blurb.
describe('effectMatchesQuery', () => {
  it('matches on the blurb, not only the name', () => {
    // Black & White's blurb is "Drain to grayscale"; the name has no "grayscale".
    expect(effectMatchesQuery('blackAndWhite', 'grayscale')).toBe(true)
  })

  it('matches everything on an empty query', () => {
    expect(effectMatchesQuery('echo', '   ')).toBe(true)
  })
})

// filterEffectFamilies narrows the catalog for the picker.
describe('filterEffectFamilies', () => {
  it('returns the full catalog unchanged for an empty query', () => {
    // Search overlays browse — with no query the picker shows every family.
    expect(filterEffectFamilies('')).toBe(effectFamilies)
  })

  it('drops families with no matching effect', () => {
    // "kaleidoscope" lives only in Distort, so only Distort survives.
    const result = filterEffectFamilies('kaleidoscope')
    expect(result.map((f) => f.id)).toEqual(['distort'])
  })

  it('keeps only the matching effects within a surviving family', () => {
    const distort = filterEffectFamilies('kaleidoscope').find((f) => f.id === 'distort')
    expect(distort?.effects).toEqual(['kaleidoscope'])
  })
})
