import { shaderLibrary } from '@/lib/shaders'
import { ShaderType } from '@/types/shader'
import { EFFECT_SLUG_PATTERN, buildEffectRecord, parseEffectRecord } from '@/effects-contract'
import { hydrateEffectDefinition } from './customEffects'
import { slugForEffectKey, toEffectDefinition } from './toEffectDefinition'

/**
 * The migration's keystone: every builtin must survive the full round trip
 * code → definition → wire record → parse → hydrate and come back as itself.
 * This is the proof that publishing the library to the PDS loses nothing —
 * if a builtin gains an input kind the contract can't express, or hydration
 * rebuilds it differently than the factory did, exactly one of these cases
 * goes red and names the effect.
 */

const entries = Object.entries(shaderLibrary) as [ShaderType, (typeof shaderLibrary)[ShaderType]][]

describe('every builtin → valid wire record', () => {
  it.each(entries.map(([key]) => [key]))('%s parses clean', (key) => {
    const def = toEffectDefinition(key, shaderLibrary[key])
    const result = parseEffectRecord(buildEffectRecord(def, '2026-08-08T00:00:00.000Z'))
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(result.def).toEqual(def)
  })
})

describe('every builtin survives hydration', () => {
  it.each(entries.map(([key]) => [key]))('%s reproduces itself', (key) => {
    const effect = shaderLibrary[key]
    const hydrated = hydrateEffectDefinition(toEffectDefinition(key, effect))
    expect(hydrated.name).toBe(effect.name)
    expect(hydrated.declarationVars).toEqual(effect.declarationVars)
    expect(hydrated.defaultValues).toEqual(effect.defaultValues)
    expect(hydrated.inputs).toEqual(effect.inputs)
    expect(hydrated.getBody()).toBe(effect.getBody())
    expect(hydrated.animatedBy).toBe(effect.animatedBy)
  })
})

describe('slugForEffectKey', () => {
  it('kebab-cases a camelCase key', () => {
    expect(slugForEffectKey('blackAndWhite')).toBe('black-and-white')
  })

  it('leaves a single word untouched', () => {
    expect(slugForEffectKey('vignette')).toBe('vignette')
  })

  it('every builtin key → a valid, unique rkey slug', () => {
    const slugs = entries.map(([key]) => slugForEffectKey(key))
    for (const slug of slugs) expect(slug).toMatch(EFFECT_SLUG_PATTERN)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
