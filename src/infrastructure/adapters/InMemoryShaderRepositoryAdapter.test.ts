import { InMemoryShaderRepositoryAdapter } from './InMemoryShaderRepositoryAdapter'
import { stillEffect, animatedEffect } from '@/lib/shaders/testEffects'

describe('InMemoryShaderRepositoryAdapter', () => {
  it('resolves a registered custom effect by its AT-URI key', () => {
    const repo = new InMemoryShaderRepositoryAdapter()
    const uri = 'at://did:plc:example/com.luminframe.effect/invert'
    repo.register(uri, stillEffect)
    expect(repo.getShader(uri)).toBe(stillEffect)
    expect(repo.getAvailableTypes()).toContain(uri)
  })

  it('re-registering a key overwrites in place', () => {
    // Deliberate: a re-fetch after republishing an effect must update it.
    const repo = new InMemoryShaderRepositoryAdapter()
    const uri = 'at://did:plc:example/com.luminframe.effect/invert'
    repo.register(uri, stillEffect)
    repo.register(uri, animatedEffect)
    expect(repo.getShader(uri)).toBe(animatedEffect)
  })

  it('unknown key → throws naming the key', () => {
    const repo = new InMemoryShaderRepositoryAdapter()
    expect(() => repo.getShader('at://gone')).toThrow("Shader 'at://gone' not found")
  })
})
