import { registeredShaders, ShaderType } from '@/types/shader'
import { effectFamilies, effectBlurbs, categoryOf, familiesOf, familyOf, isEffectCategory } from './catalog'

// The catalog is the navigation's contract: if these break, an effect has
// fallen out of the picker or gained a phantom entry. They're the safety net
// that lets effects be added without silently losing their place.
describe('effect catalog', () => {
  const familyEffects = effectFamilies.flatMap((f) => f.effects)

  it('places every registered shader in exactly one family', () => {
    const sorted = [...familyEffects].sort()
    const expected = [...registeredShaders].sort()
    expect(sorted).toEqual(expected)
  })

  it('lists no effect that is not a registered shader', () => {
    const registered = new Set<string>(registeredShaders)
    const strays = familyEffects.filter((type) => !registered.has(type))
    expect(strays).toEqual([])
  })

  it('gives every registered shader a blurb', () => {
    const missing = registeredShaders.filter((type) => !effectBlurbs[type]?.trim())
    expect(missing).toEqual([])
  })

  it('resolves a family for every registered shader', () => {
    const unmapped = registeredShaders.filter((type) => !categoryOf(type as ShaderType))
    expect(unmapped).toEqual([])
  })
})

// familiesOf is the boundary the "discover by look" filter and rail both stand on,
// fed by untrusted network effect keys — so the cases that matter are the family
// mapping, the dedupe, and (most of all) surviving a key this build doesn't know.
describe('familiesOf', () => {
  it('maps each known effect to its family', () => {
    // sepia ∈ Color, wave ∈ Distort (see effectFamilies)
    expect(familiesOf(['sepia', 'wave'])).toEqual(new Set(['color', 'distort']))
  })

  it('collapses two effects of one family to a single entry', () => {
    // sepia and vibrance are both Color — the set holds 'color' once
    expect(familiesOf(['sepia', 'vibrance'])).toEqual(new Set(['color']))
  })

  it('ignores an effect key this build does not know', () => {
    expect(familiesOf(['sepia', 'notARealEffect'])).toEqual(new Set(['color']))
  })

  it('is empty for no effects', () => {
    expect(familiesOf([])).toEqual(new Set())
  })
})

// familyOf gates whether an effect chip becomes a filter link — an unknown key
// must yield null so the chip stays a plain label, not a link to nowhere.
describe('familyOf', () => {
  it('returns the family of a known effect', () => {
    expect(familyOf('crt')).toBe('texture')
  })

  it('returns null for an effect this build does not know', () => {
    expect(familyOf('notARealEffect')).toBeNull()
  })
})

describe('isEffectCategory', () => {
  it('accepts a known family id', () => {
    expect(isEffectCategory('texture')).toBe(true)
  })

  it('rejects a value that is not a family id', () => {
    expect(isEffectCategory('sepia')).toBe(false)
  })
})
