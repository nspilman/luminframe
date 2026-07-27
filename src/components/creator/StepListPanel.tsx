import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecipeStepDef } from '@/effects-contract'

/** One effect the chain may add: its registry key and display name. */
export interface StepOption {
  key: string
  name: string
}

type StepListPanelProps = {
  steps: readonly RecipeStepDef[]
  /** Display name for a step key; unresolvable keys fall back to the raw key. */
  nameOf: (type: string) => string
  /** The step whose parameters are open for tuning. */
  selectedIndex: number | null
  onSelect: (index: number) => void
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  /** Effects the chain may add — builtins plus published customs, never device-local keys. */
  options: readonly StepOption[]
  onAdd: (key: string) => void
}

/**
 * The chain itself — the Compose room's subject. Each step is a row: click to
 * open its knobs, reorder with the arrows, remove with the ✗. "Add a step"
 * opens a compact searchable list (names only — the full thumbnail picker
 * belongs to the editor, where there's an image to preview on).
 */
export function StepListPanel({
  steps,
  nameOf,
  selectedIndex,
  onSelect,
  onMove,
  onRemove,
  options,
  onAdd,
}: StepListPanelProps) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q === '' ? options : options.filter((o) => o.name.toLowerCase().includes(q))
  }, [options, query])

  const add = (key: string) => {
    onAdd(key)
    setAdding(false)
    setQuery('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Chain — applied top to bottom</h3>
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
          {adding ? 'Close' : 'Add a step'}
        </Button>
      </div>

      {adding && (
        <div className="space-y-1 rounded-lg border border-zinc-800/60 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches[0]) add(matches[0].key)
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Search effects"
              aria-label="Search effects to add"
              className="w-full rounded border border-zinc-800/60 bg-black/30 py-1.5 pl-7 pr-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-zinc-500">No effects match “{query}”</p>
            ) : (
              matches.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => add(option.key)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-white/5"
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {steps.length === 0 ? (
        <p className="px-1 text-xs text-zinc-500">No steps yet — add the first effect.</p>
      ) : (
        <ol className="space-y-0.5">
          {steps.map((step, index) => (
            <li key={index} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-pressed={index === selectedIndex}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-violet-600/20 text-white'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span className="w-4 shrink-0 text-right tabular-nums text-zinc-600">{index + 1}</span>
                <span className="truncate">{nameOf(step.type)}</span>
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${nameOf(step.type)} up`}
                className="shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === steps.length - 1}
                aria-label={`Move ${nameOf(step.type)} down`}
                className="shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${nameOf(step.type)}`}
                className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
