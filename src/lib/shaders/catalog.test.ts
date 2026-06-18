import { registeredShaders, ShaderType } from '@/types/shader'
import { effectFamilies, effectBlurbs, categoryOf } from './catalog'

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
