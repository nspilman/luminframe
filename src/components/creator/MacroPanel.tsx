import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MacroBinding, MacroDef, RecipeStepDef } from '@/effects-contract'
import { EffectRegistry } from '@/types/shader'

type MacroPanelProps = {
  macros: readonly MacroDef[]
  steps: readonly RecipeStepDef[]
  registry: EffectRegistry
  /** Display name for a step key (the StepListPanel rule). */
  nameOf: (type: string) => string
  onChange: (macros: MacroDef[]) => void
}

/** The range params a binding may target on one step's effect. */
function rangeParamsOf(registry: EffectRegistry, step: RecipeStepDef | undefined): string[] {
  const effect = step && registry[step.type]
  if (!effect) return []
  return Object.entries(effect.inputs)
    .filter(([, input]) => input.type === 'range')
    .map(([name]) => name)
}

/** The first bindable step/param in the chain, or null when nothing ranges. */
function firstBinding(registry: EffectRegistry, steps: readonly RecipeStepDef[]): MacroBinding | null {
  for (let i = 0; i < steps.length; i++) {
    const [param] = rangeParamsOf(registry, steps[i])
    if (param) return { step: i, param }
  }
  return null
}

/**
 * Authoring the Look's knobs: each macro is a named 0..1 knob whose bindings
 * write onto step params — one knob may drive several. from/to default to the
 * bound param's own bounds (the placeholders show them); the authoritative
 * judgment of names and references stays with parseRecipeRecord in the
 * validation loop.
 */
export function MacroPanel({ macros, steps, registry, nameOf, onChange }: MacroPanelProps) {
  const patch = (index: number, changes: Partial<MacroDef>) =>
    onChange(macros.map((m, i) => (i === index ? { ...m, ...changes } : m)))
  const patchBinding = (m: number, b: number, changes: Partial<MacroBinding>) =>
    patch(m, {
      bindings: macros[m].bindings.map((binding, i) => {
        if (i !== b) return binding
        const next = { ...binding, ...changes }
        // Retargeting the step retargets the param with it — the old param
        // name means nothing on the new step's effect.
        if (changes.step !== undefined && changes.param === undefined) {
          next.param = rangeParamsOf(registry, steps[changes.step])[0] ?? next.param
          delete next.from
          delete next.to
        }
        return next
      }),
    })

  const addMacro = () => {
    const binding = firstBinding(registry, steps)
    if (!binding) return
    let name = 'knob'
    let n = 2
    while (macros.some((m) => m.name === name)) name = `knob${n++}`
    onChange([...macros, { name, label: 'Knob', default: 0.5, bindings: [binding] }])
  }

  const bindable = firstBinding(registry, steps) !== null

  // Committing a numeric field on blur; a non-finite entry leaves the value as it was.
  const numberField = (
    value: number | undefined,
    commit: (v: number | undefined) => void,
    placeholder: string
  ) => (
    <Input
      type="number"
      defaultValue={value ?? ''}
      key={value ?? 'unset'}
      step="any"
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.valueAsNumber
        commit(Number.isFinite(v) ? v : undefined)
      }}
      className="h-8 text-xs"
    />
  )

  return (
    <div className="space-y-2 border-t border-zinc-800/50 pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">
          Knobs — the look's own controls
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addMacro}
          disabled={!bindable}
          className="gap-1 text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a knob
        </Button>
      </div>
      {macros.length === 0 && (
        <p className="px-1 text-xs text-zinc-500">
          {bindable
            ? 'Optional: expose a knob or two — each drives step settings you pick, so the whole look tunes with one slider.'
            : 'Add a step with slider settings first — knobs drive those.'}
        </p>
      )}
      {macros.map((macro, m) => (
        <div key={m} className="space-y-2 rounded-lg border border-zinc-800/60 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={macro.label}
              onChange={(e) => patch(m, { label: e.target.value })}
              placeholder="Label"
              aria-label="Knob label"
              className="h-8 text-xs"
            />
            <Input
              value={macro.name}
              onChange={(e) => patch(m, { name: e.target.value })}
              placeholder="name"
              aria-label="Knob name"
              spellCheck={false}
              className="h-8 font-mono text-xs"
            />
            {numberField(macro.default, (v) => patch(m, { default: v ?? 0 }), 'default 0..1')}
            <button
              type="button"
              onClick={() => onChange(macros.filter((_, i) => i !== m))}
              aria-label={`Remove ${macro.label}`}
              className="shrink-0 rounded p-1.5 text-zinc-600 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {macro.bindings.map((binding, b) => {
            const params = rangeParamsOf(registry, steps[binding.step])
            return (
              <div key={b} className="flex items-center gap-1.5 pl-2">
                <Select
                  value={String(binding.step)}
                  onValueChange={(v) => patchBinding(m, b, { step: Number(v) })}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {steps.map((step, i) => (
                      <SelectItem key={i} value={String(i)} disabled={rangeParamsOf(registry, step).length === 0}>
                        {i + 1} — {nameOf(step.type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={binding.param}
                  onValueChange={(v) => patchBinding(m, b, { param: v })}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {params.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {numberField(binding.from, (v) => patchBinding(m, b, { from: v }), 'from')}
                {numberField(binding.to, (v) => patchBinding(m, b, { to: v }), 'to')}
                <button
                  type="button"
                  onClick={() => patch(m, { bindings: macro.bindings.filter((_, i) => i !== b) })}
                  disabled={macro.bindings.length === 1}
                  aria-label="Remove binding"
                  className="shrink-0 rounded p-1 text-zinc-600 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const binding = firstBinding(registry, steps)
              if (binding) patch(m, { bindings: [...macro.bindings, binding] })
            }}
            className="gap-1 pl-2 text-xs text-zinc-500"
          >
            <Plus className="h-3 w-3" />
            Drive another setting
          </Button>
        </div>
      ))}
    </div>
  )
}
