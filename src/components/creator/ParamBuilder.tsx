import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EffectParamDef } from '@/effects-contract'

type ParamBuilderProps = {
  params: readonly EffectParamDef[]
  onChange: (params: EffectParamDef[]) => void
}

/** A fresh param of the given kind, named uniquely against the existing set. */
export function newParam(type: EffectParamDef['type'], existing: readonly EffectParamDef[]): EffectParamDef {
  let name = 'amount'
  let n = 2
  while (existing.some((p) => p.name === name)) name = `amount${n++}`
  const base = { name, label: 'Amount' }
  switch (type) {
    case 'range':
      return { type, ...base, default: 0.5, min: 0, max: 1, step: 0.01 }
    case 'color':
      return { type, ...base, label: 'Color', default: [1, 1, 1] }
    case 'boolean':
      return { type, ...base, label: 'Toggle', default: false }
    case 'vec2':
      return { type, ...base, label: 'Point', default: [0.5, 0.5] }
  }
}

/**
 * Authoring the effect's editable parameters — the meta-form where each row
 * defines a knob the editor will later render. Numeric fields commit on blur
 * (half-typed numbers never reach the draft); the authoritative judgment of
 * names and bounds stays with parseEffectRecord in the validation loop, whose
 * errors name the offending param.
 */
export function ParamBuilder({ params, onChange }: ParamBuilderProps) {
  const patch = (index: number, changes: Partial<EffectParamDef>) => {
    onChange(params.map((p, i) => (i === index ? ({ ...p, ...changes } as EffectParamDef) : p)))
  }
  const remove = (index: number) => onChange(params.filter((_, i) => i !== index))

  // Committing a numeric field on blur; a non-finite entry leaves the value as it was.
  const numberField = (
    value: number,
    commit: (v: number) => void,
    attrs: { step?: number; placeholder?: string } = {}
  ) => (
    <Input
      type="number"
      defaultValue={value}
      key={value}
      step={attrs.step ?? 'any'}
      placeholder={attrs.placeholder}
      onBlur={(e) => {
        const v = e.target.valueAsNumber
        if (Number.isFinite(v) && v !== value) commit(v)
      }}
      className="h-8 px-2 text-xs"
    />
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Params</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...params, newParam('range', params)])}
          className="gap-1 text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {params.length === 0 && (
        <p className="px-1 text-xs text-zinc-500">
          No knobs yet — the effect will still get the free Opacity control.
        </p>
      )}
      {params.map((param, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-zinc-800/60 p-2">
          <div className="flex items-center gap-2">
            <Select
              value={param.type}
              onValueChange={(type) =>
                onChange(params.map((p, j) => (j === i ? { ...newParam(type as EffectParamDef['type'], params.filter((_, k) => k !== i)), name: p.name, label: p.label } : p)))
              }
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">range</SelectItem>
                <SelectItem value="color">color</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="vec2">vec2</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${param.name}`}
              className="ml-auto rounded p-1 text-zinc-600 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">name (GLSL)</span>
              <Input
                value={param.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                autoCapitalize="none"
                spellCheck={false}
                className="h-8 px-2 font-mono text-xs"
              />
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">label</span>
              <Input
                value={param.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                className="h-8 px-2 text-xs"
              />
            </div>
          </div>
          {param.type === 'range' && (
            <div className="grid grid-cols-4 gap-2">
              {(['default', 'min', 'max', 'step'] as const).map((field) => (
                <div key={field}>
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">{field}</span>
                  {numberField(param[field], (v) => patch(i, { [field]: v }))}
                </div>
              ))}
            </div>
          )}
          {param.type === 'color' && (
            <div className="grid grid-cols-3 gap-2">
              {(['r', 'g', 'b'] as const).map((channel, c) => (
                <div key={channel}>
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">{channel} (0–1)</span>
                  {numberField(param.default[c], (v) => {
                    const next = [...param.default] as [number, number, number]
                    next[c] = v
                    patch(i, { default: next })
                  })}
                </div>
              ))}
            </div>
          )}
          {param.type === 'boolean' && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <Switch checked={param.default} onCheckedChange={(v) => patch(i, { default: v })} />
              default on
            </label>
          )}
          {param.type === 'vec2' && (
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y'] as const).map((axis, c) => (
                <div key={axis}>
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">{axis}</span>
                  {numberField(param.default[c], (v) => {
                    const next = [...param.default] as [number, number]
                    next[c] = v
                    patch(i, { default: next })
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
