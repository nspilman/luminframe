import { hydrateRecipe, coerceToDefault } from './hydrateRecipe'
import { serializeRecipe } from './serializeRecipe'
import { shaderLibrary } from '@/lib/shaders'
import { Color } from '@/domain/value-objects/Color'

describe('coerceToDefault', () => {
  it('turns a hex string into a Color when the default is a Color', () => {
    const out = coerceToDefault('#3366ff', Color.fromRGB(1, 0, 0))
    expect(out).toBeInstanceOf(Color)
    expect((out as Color).toHex()).toBe('#3366ff')
  })

  it('keeps a number when the default is a number', () => {
    expect(coerceToDefault(0.8, 0.5)).toBe(0.8)
  })

  it('falls back to the default when the stored value has the wrong type', () => {
    // A number where a Color is expected can't be coerced — keep the default.
    const def = Color.fromRGB(1, 0, 0)
    expect(coerceToDefault(42, def)).toBe(def)
  })
})

describe('hydrateRecipe', () => {
  it('rebuilds a colorTint step: hex → Color, number preserved, defaults filled', () => {
    const [step] = hydrateRecipe(
      [{ type: 'colorTint', params: { tintColor: '#3366ff', tintStrength: 0.8 } }],
      shaderLibrary
    )
    expect(step.type).toBe('colorTint')
    expect(step.params.tintColor).toBeInstanceOf(Color)
    expect((step.params.tintColor as Color).toHex()).toBe('#3366ff')
    expect(step.params.tintStrength).toBe(0.8)
    // A param the caller didn't store still comes back from the effect's defaults.
    expect('imageTexture' in step.params).toBe(true)
  })

  it('drops an effect the registry cannot resolve', () => {
    expect(hydrateRecipe([{ type: 'notARealEffect', params: {} }], shaderLibrary)).toEqual([])
  })

  it('hydrates a custom effect when the registry resolves its AT-URI', () => {
    const uri = 'at://did:plc:example/com.luminframe.effect/invert'
    const registry = { ...shaderLibrary, [uri]: shaderLibrary.colorTint }
    const [step] = hydrateRecipe([{ type: uri, params: { tintStrength: 0.4 } }], registry)
    expect(step.type).toBe(uri)
    // Params coerce against the custom effect's own defaults, same as builtins.
    expect(step.params.tintStrength).toBe(0.4)
  })

  it('round-trips through serializeRecipe: a stored recipe hydrates and re-serializes identically', () => {
    const stored = [{ type: 'colorTint', params: { tintColor: '#3366ff', tintStrength: 0.7 } }]
    const reSerialized = serializeRecipe(hydrateRecipe(stored, shaderLibrary))
    const step = reSerialized.find((s) => s.type === 'colorTint')!
    expect(step.params?.tintColor).toBe('#3366ff')
    expect(step.params?.tintStrength).toBe(0.7)
  })
})
