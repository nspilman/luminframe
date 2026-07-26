import { InMemoryShaderRepositoryAdapter } from './InMemoryShaderRepositoryAdapter'
import { shaderLibrary } from '@/lib/shaders'

describe('InMemoryShaderRepositoryAdapter', () => {
  it('resolves a registered custom effect by its AT-URI key', () => {
    const repo = new InMemoryShaderRepositoryAdapter()
    const uri = 'at://did:plc:example/com.luminframe.effect/invert'
    repo.register(uri, shaderLibrary.blackAndWhite)
    expect(repo.getShader(uri)).toBe(shaderLibrary.blackAndWhite)
    expect(repo.getAvailableTypes()).toContain(uri)
  })

  it('re-registering a key overwrites in place', () => {
    // Deliberate: a re-fetch after republishing an effect must update it.
    const repo = new InMemoryShaderRepositoryAdapter()
    const uri = 'at://did:plc:example/com.luminframe.effect/invert'
    repo.register(uri, shaderLibrary.blackAndWhite)
    repo.register(uri, shaderLibrary.wave)
    expect(repo.getShader(uri)).toBe(shaderLibrary.wave)
  })

  it('unknown key → throws naming the key', () => {
    const repo = new InMemoryShaderRepositoryAdapter()
    expect(() => repo.getShader('at://gone')).toThrow("Shader 'at://gone' not found")
  })
})
