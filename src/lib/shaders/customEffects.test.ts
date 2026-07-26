import { hydrateEffectDefinition } from './customEffects'
import { checkEffectCompiles } from './compileCheck'
import { motionOf } from './animation'
import { EffectDefinition } from '@/effects-contract'

/**
 * Pins that a hydrated custom effect is indistinguishable from a builtin to
 * everything downstream: same injected uniforms, same input shapes, same
 * wrapped body, same animation character. The factory (createShaderRecord)
 * carries the invariants; these tests catch the codec bypassing it.
 */

const def: EffectDefinition = {
  name: 'Invert',
  env: 1,
  params: [
    { type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 },
    { type: 'color', name: 'tint', label: 'Tint', default: [1, 0.5, 0] },
    { type: 'boolean', name: 'flip', label: 'Flip', default: true },
    { type: 'vec2', name: 'center', label: 'Center', default: [0.5, 0.5] },
  ],
  body: 'void main() { gl_FragColor = vec4(1.0 - texture2D(imageTexture, vUv).rgb * amount, 1.0); }',
}

describe('hydrateEffectDefinition', () => {
  const effect = hydrateEffectDefinition(def)

  it('declares the host-provided imageTexture plus every param', () => {
    expect(Object.keys(effect.declarationVars)).toEqual([
      'imageTexture', 'amount', 'tint', 'flip', 'center', 'resolution', 'opacity',
    ])
  })

  it('maps param kinds to their input types', () => {
    expect(effect.inputs.amount.type).toBe('range')
    expect(effect.inputs.tint.type).toBe('color')
    expect(effect.inputs.flip.type).toBe('boolean')
    expect(effect.inputs.center.type).toBe('vec2')
  })

  it('gets the free opacity control at default 1, like every builtin', () => {
    expect(effect.inputs.opacity.type).toBe('range')
    expect(effect.defaultValues.opacity).toBe(1)
  })

  it('wraps the body for opacity blending', () => {
    expect(effect.getBody()).toContain('lfEffectMain')
  })

  it('a still body → still', () => {
    expect(motionOf(effect)).toBe('still')
  })

  it('a time-driven body with an animatedBy gate defaulting to zero → gated', () => {
    const gated = hydrateEffectDefinition({
      ...def,
      animatedBy: 'drift',
      params: [{ type: 'range', name: 'drift', label: 'Drift', default: 0, min: 0, max: 2, step: 0.05 }],
      body: 'void main() { gl_FragColor = vec4(vec3(sin(time * drift)), 1.0); }',
    })
    expect(motionOf(gated)).toBe('gated')
  })
})

describe('checkEffectCompiles', () => {
  it('reports unavailable in jsdom', () => {
    // Pins the degrade path: no WebGL here, and callers must treat that as a
    // pass rather than silently excluding every effect in test/CI environments.
    expect(checkEffectCompiles(hydrateEffectDefinition(def))).toEqual({ status: 'unavailable' })
  })
})
