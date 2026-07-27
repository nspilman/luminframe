import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StoredDraft } from '@/lib/effectDrafts'

type DraftListPanelProps = {
  drafts: readonly StoredDraft[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  onNew: () => void
  onDelete: (slug: string) => void
}

/**
 * The room's drafts: pick one to work on, start fresh, or let one go.
 * Delete is the two-stage inline confirm the app uses everywhere — the first
 * click arms it, the second commits, anything else disarms.
 */
export function DraftListPanel({ drafts, selectedSlug, onSelect, onNew, onDelete }: DraftListPanelProps) {
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Drafts</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onNew} className="gap-1 text-zinc-300">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      {drafts.length === 0 ? (
        <p className="px-1 text-xs text-zinc-500">Nothing yet — start one.</p>
      ) : (
        <ol className="space-y-0.5">
          {drafts.map((draft) => (
            <li key={draft.slug} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(draft.slug)}
                aria-pressed={draft.slug === selectedSlug}
                className={`min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  draft.slug === selectedSlug
                    ? 'bg-violet-600/20 text-white'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                {draft.name || draft.slug}
              </button>
              {confirming === draft.slug ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(null)
                    onDelete(draft.slug)
                  }}
                  onBlur={() => setConfirming(null)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Really delete?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(draft.slug)}
                  aria-label={`Delete ${draft.name || draft.slug}`}
                  className="shrink-0 rounded p-1.5 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
