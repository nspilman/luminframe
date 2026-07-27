import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OP_CATALOG } from '@/lib/blocks/catalog'
import {
  ArgRef,
  BlockValueType,
  KnobValue,
  OpInstance,
  ShaderSourceDoc,
} from '@/lib/blocks/types'

type OpStackPanelProps = {
  doc: ShaderSourceDoc
  /** The row whose inputs and knobs are open. */
  selectedRow: number | null
  onSelectRow: (index: number | null) => void
  /** Preview the chain only up to this row (the value it makes, visualized). */
  soloRow: number | null
  onSoloRow: (index: number | null) => void
  onChangeRow: (index: number, next: OpInstance) => void
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  onAdd: (key: string) => void
}

/** What "current" carries entering row i — the previous row's output. */
function typeBefore(doc: ShaderSourceDoc, index: number): BlockValueType {
  return index === 0 ? 'vec3' : OP_CATALOG[doc.ops[index - 1].op].out
}

/** The wiring choices for one arg at one row, each with a display label. */
function argOptions(
  doc: ShaderSourceDoc,
  index: number,
  type: BlockValueType
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  if (typeBefore(doc, index) === type) options.push({ value: 'current', label: 'the row above' })
  if (type === 'vec3') options.push({ value: 'source', label: 'the photo' })
  for (let i = 0; i < index; i++) {
    const tap = doc.ops[i].tap
    if (tap && OP_CATALOG[doc.ops[i].op].out === type) {
      options.push({ value: `tap:${tap}`, label: `“${tap}” (row ${i + 1})` })
    }
  }
  return options
}

const AUTO = 'auto'

const refToValue = (ref: ArgRef | undefined): string =>
  ref === undefined ? AUTO : typeof ref === 'string' ? ref : `tap:${ref.tap}`

const valueToRef = (value: string): ArgRef | undefined =>
  value === AUTO ? undefined : value.startsWith('tap:') ? { tap: value.slice(4) } : (value as ArgRef)

const TYPE_LABEL: Record<BlockValueType, string> = {
  float: 'value',
  vec2: 'position',
  vec3: 'color',
}

const rgbToHex = ([r, g, b]: [number, number, number]) =>
  '#' + [r, g, b].map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
]

/**
 * The program itself: a vertical stack of blocks, read top to bottom. Click a
 * row to open its inputs and knobs; the eye solos the chain up to that row so
 * a mid-chain mask or warp can be seen as it is. Adding is a compact
 * searchable list — names and plain-speech blurbs, no thumbnails.
 */
export function OpStackPanel({
  doc,
  selectedRow,
  onSelectRow,
  soloRow,
  onSoloRow,
  onChangeRow,
  onMove,
  onRemove,
  onAdd,
}: OpStackPanelProps) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = Object.values(OP_CATALOG)
    return q === ''
      ? all
      : all.filter((s) => s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q))
  }, [query])

  const add = (key: string) => {
    onAdd(key)
    setAdding(false)
    setQuery('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Blocks — read top to bottom</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding((a) => !a)
            setQuery('')
          }}
          className="gap-1 text-zinc-300"
        >
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {adding ? 'Close' : 'Add a block'}
        </Button>
      </div>

      {adding && (
        <div className="space-y-1 rounded-lg border border-zinc-800/60 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches[0]) add(matches[0].key)
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Search blocks"
              aria-label="Search blocks to add"
              className="w-full rounded border border-zinc-800/60 bg-black/30 py-1.5 pl-7 pr-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {matches.map((spec) => (
              <button
                key={spec.key}
                type="button"
                onClick={() => add(spec.key)}
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-white/5"
              >
                <span className="text-sm text-zinc-200">{spec.name}</span>
                <span className="ml-2 text-xs text-zinc-500">{spec.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {doc.ops.length === 0 ? (
        <p className="px-1 text-xs text-zinc-500">No blocks yet — add the first one.</p>
      ) : (
        <ol className="space-y-0.5">
          {doc.ops.map((op, index) => {
            const spec = OP_CATALOG[op.op]
            const isOpen = index === selectedRow
            return (
              <li key={index} className="rounded-lg border border-zinc-800/60">
                <div className="group flex items-center gap-1 p-1">
                  <button
                    type="button"
                    onClick={() => onSelectRow(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      isOpen ? 'bg-violet-600/20 text-white' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="w-4 shrink-0 text-right tabular-nums text-zinc-600">{index + 1}</span>
                    <span className="truncate">{spec.name}</span>
                    {op.tap && (
                      <span className="shrink-0 rounded bg-violet-600/20 px-1.5 text-[10px] text-violet-300">
                        “{op.tap}”
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">
                      {TYPE_LABEL[spec.out]}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSoloRow(soloRow === index ? null : index)}
                    aria-label={`Preview up to ${spec.name}`}
                    aria-pressed={soloRow === index}
                    className={`shrink-0 rounded p-1 ${soloRow === index ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-200'}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${spec.name} up`}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === doc.ops.length - 1}
                    aria-label={`Move ${spec.name} down`}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={`Remove ${spec.name}`}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-zinc-800/50 p-3">
                    {Object.entries(spec.args).map(([name, argSpec]) => {
                      const options = argOptions(doc, index, argSpec.type)
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-xs text-zinc-400">
                            {name} <span className="text-zinc-600">({TYPE_LABEL[argSpec.type]})</span>
                          </span>
                          <Select
                            value={refToValue(op.args?.[name])}
                            onValueChange={(v) => {
                              const args = { ...op.args }
                              const ref = valueToRef(v)
                              if (ref === undefined) delete args[name]
                              else args[name] = ref
                              onChangeRow(index, { ...op, args })
                            }}
                          >
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={AUTO}>auto</SelectItem>
                              {options.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}

                    {Object.entries(spec.knobs).map(([name, knobSpec]) => {
                      const value = (op.knobs?.[name] ?? knobSpec.default) as KnobValue
                      const setKnob = (v: KnobValue) =>
                        onChangeRow(index, { ...op, knobs: { ...op.knobs, [name]: v } })
                      const exposed = op.exposed?.includes(name) ?? false
                      const setExposed = (on: boolean) =>
                        onChangeRow(index, {
                          ...op,
                          exposed: on
                            ? [...(op.exposed ?? []), name]
                            : (op.exposed ?? []).filter((e) => e !== name),
                        })
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">
                              {knobSpec.label}
                              {knobSpec.kind === 'range' && (
                                <span className="ml-2 tabular-nums text-zinc-500">
                                  {(value as number).toFixed(2)}
                                </span>
                              )}
                            </span>
                            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                              slider for everyone
                              <Switch checked={exposed} onCheckedChange={setExposed} />
                            </label>
                          </div>
                          {knobSpec.kind === 'range' && (
                            <Slider
                              value={[value as number]}
                              min={knobSpec.min}
                              max={knobSpec.max}
                              step={knobSpec.step}
                              onValueChange={([v]) => setKnob(v)}
                            />
                          )}
                          {knobSpec.kind === 'toggle' && (
                            <Switch checked={value as boolean} onCheckedChange={setKnob} />
                          )}
                          {knobSpec.kind === 'color' && (
                            <input
                              type="color"
                              value={rgbToHex(value as [number, number, number])}
                              onChange={(e) => setKnob(hexToRgb(e.target.value))}
                              aria-label={knobSpec.label}
                              className="h-8 w-full cursor-pointer rounded border border-zinc-800/60 bg-black/30"
                            />
                          )}
                        </div>
                      )
                    })}

                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-zinc-400">name it</span>
                      <Input
                        value={op.tap ?? ''}
                        onChange={(e) =>
                          onChangeRow(index, {
                            ...op,
                            ...(e.target.value ? { tap: e.target.value } : { tap: undefined }),
                          })
                        }
                        placeholder="so later blocks can use this row"
                        spellCheck={false}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
