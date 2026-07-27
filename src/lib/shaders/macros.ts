import { MacroDef, RecipeDefinition, RecipeStepDef } from '@/effects-contract'
import { EffectRegistry, ShaderEffect } from '@/types/shader'

/**
 * Macro knobs at apply time. A macro is a normalized knob t ∈ [0, 1]; each of
 * its bindings lands t on one step param as lerp(from, to, t), where an
 * omitted from/to falls back to that param's own bounds on the loaded effect.
 * That fallback is why this lives app-side and takes the registry: only the
 * loaded effect knows its params' ranges — the grammar checked everything a
 * record alone could prove.
 */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/**
 * The steps with every macro's value written through its bindings. A binding
 * whose step, effect, or range param doesn't resolve is skipped — the chain
 * still applies; that knob just doesn't reach it.
 */
export function applyMacroValues(
  def: RecipeDefinition,
  values: Record<string, number>,
  registry: EffectRegistry
): RecipeStepDef[] {
  if (!def.macros || def.macros.length === 0) return def.steps
  const steps = def.steps.map((s) => ({ ...s, params: { ...s.params } }))
  for (const macro of def.macros) {
    const t = clamp01(values[macro.name] ?? macro.default)
    for (const binding of macro.bindings) {
      const step = steps[binding.step]
      const input = step && registry[step.type]?.inputs[binding.param]
      if (!input || input.type !== 'range') continue
      const from = binding.from ?? input.min
      const to = binding.to ?? input.max
      step.params![binding.param] = from + (to - from) * t
    }
  }
  return steps
}

/**
 * The staged Look's control surface: a synthetic effect whose inputs are the
 * macros themselves (each a 0..1 range), so ShaderControls renders macro
 * knobs through the same parameter registry as everything else. Never
 * registered or rendered — it exists only to be a controls description.
 */
export function macroControlsFor(name: string, macros: readonly MacroDef[]): ShaderEffect {
  return {
    name,
    declarationVars: {},
    defaultValues: Object.fromEntries(macros.map((m) => [m.name, m.default])),
    inputs: Object.fromEntries(
      macros.map((m) => [m.name, { type: 'range' as const, label: m.label, min: 0, max: 1, step: 0.01 }])
    ),
    getBody: () => '',
  }
}
