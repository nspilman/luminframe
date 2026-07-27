import { RecipeDefinition } from '@/effects-contract'
import { EffectRegistry, ShaderEffect } from '@/types/shader'
import { applyMacroValues } from './macros'

/** A minimal loaded effect: one range param `amount` bounded [min, max]. */
const rangeEffect = (min: number, max: number): ShaderEffect => ({
  name: 'Test',
  declarationVars: { amount: 'float' },
  defaultValues: { amount: min },
  inputs: { amount: { type: 'range', label: 'Amount', min, max, step: 0.01 } },
  getBody: () => '',
})

const registry: EffectRegistry = {
  blur: rangeEffect(0, 20),
  grain: rangeEffect(0.5, 6),
}

const look = (macros: RecipeDefinition['macros']): RecipeDefinition => ({
  name: 'Look',
  steps: [{ type: 'blur' }, { type: 'grain', params: { other: 3 } }],
  macros,
})

describe('applyMacroValues', () => {
  it('lerps an explicit from/to binding', () => {
    // from 0, to 10, t 0.3 → 0 + (10 - 0) * 0.3 = 3
    const def = look([
      { name: 'k', label: 'K', default: 0, bindings: [{ step: 0, param: 'amount', from: 0, to: 10 }] },
    ])
    expect(applyMacroValues(def, { k: 0.3 }, registry)[0].params).toEqual({ amount: 3 })
  })

  it('falls back to the effect param bounds when from/to are omitted', () => {
    // grain's amount spans [0.5, 6]; t 0.5 → 0.5 + 5.5 * 0.5 = 3.25
    const def = look([
      { name: 'k', label: 'K', default: 0, bindings: [{ step: 1, param: 'amount' }] },
    ])
    expect(applyMacroValues(def, { k: 0.5 }, registry)[1].params?.amount).toBe(3.25)
  })

  it('clamps t above 1 to the to-value', () => {
    const def = look([
      { name: 'k', label: 'K', default: 0, bindings: [{ step: 0, param: 'amount', from: 0, to: 10 }] },
    ])
    expect(applyMacroValues(def, { k: 1.5 }, registry)[0].params).toEqual({ amount: 10 })
  })

  it('uses the macro default when no value is given', () => {
    const def = look([
      { name: 'k', label: 'K', default: 1, bindings: [{ step: 0, param: 'amount', from: 0, to: 10 }] },
    ])
    expect(applyMacroValues(def, {}, registry)[0].params).toEqual({ amount: 10 })
  })

  it('one macro drives params across several steps', () => {
    const def = look([
      {
        name: 'k',
        label: 'K',
        default: 0,
        bindings: [
          { step: 0, param: 'amount', from: 0, to: 10 },
          { step: 1, param: 'amount', from: 6, to: 0.5 },
        ],
      },
    ])
    const steps = applyMacroValues(def, { k: 1 }, registry)
    expect(steps[0].params?.amount).toBe(10)
    // A reversed from/to is a valid mapping — t 1 lands on `to`.
    expect(steps[1].params?.amount).toBe(0.5)
  })

  it('does not touch params no macro binds', () => {
    const def = look([
      { name: 'k', label: 'K', default: 1, bindings: [{ step: 0, param: 'amount', from: 0, to: 1 }] },
    ])
    expect(applyMacroValues(def, { k: 1 }, registry)[1].params?.other).toBe(3)
  })

  it('skips a binding whose effect does not resolve', () => {
    const def: RecipeDefinition = {
      name: 'Look',
      steps: [{ type: 'ghost' }],
      macros: [{ name: 'k', label: 'K', default: 1, bindings: [{ step: 0, param: 'amount' }] }],
    }
    expect(applyMacroValues(def, { k: 1 }, registry)[0].params).toEqual({})
  })

  it('returns the steps untouched when the look has no macros', () => {
    const def = look(undefined)
    expect(applyMacroValues(def, {}, registry)).toBe(def.steps)
  })
})
