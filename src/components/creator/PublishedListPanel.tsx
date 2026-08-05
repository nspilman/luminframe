import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'

type PublishedListPanelProps = {
  /** The signed-in user's published records (at:// keys) with display names. */
  published: readonly { key: string; name: string }[]
  /** Published records that failed the pipeline, with their reasons. */
  skipped: readonly { uri: string; reasons: string[] }[]
  /** Seed a draft from a published record (slug = its rkey) and open it. */
  onEdit: (key: string) => void
  /** Delete the record; the caller refreshes the list afterwards. */
  onDelete: (uri: string) => Promise<void>
}

/**
 * The user's published effects, including the records the pipeline
 * refused: a broken record is exactly what
 * its author needs to see, with the named reasons, not a silent absence from
 * the picker.
 */
export function PublishedListPanel({ published, skipped, onEdit, onDelete }: PublishedListPanelProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (published.length === 0 && skipped.length === 0) return null

  const deleteButton = (uri: string, label: string) =>
    confirming === uri ? (
      <button
        type="button"
        disabled={deleting === uri}
        onClick={async () => {
          setDeleting(uri)
          try {
            await onDelete(uri)
          } finally {
            setDeleting(null)
            setConfirming(null)
          }
        }}
        onBlur={() => setConfirming(null)}
        className="shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        {deleting === uri ? 'Deleting…' : 'Really delete?'}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setConfirming(uri)}
        aria-label={`Delete ${label}`}
        className="shrink-0 rounded p-1.5 text-zinc-600 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-400">Published</h3>
      <ol className="space-y-0.5">
        {published.map((entry) => (
          <li key={entry.key} className="group flex items-center gap-1">
            <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm text-zinc-300">
              {entry.name}
              <span className="ml-1.5 font-mono text-[10px] text-zinc-600">
                {parseAtUri(entry.key)?.rkey}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onEdit(entry.key)}
              aria-label={`Edit ${entry.name}`}
              className="shrink-0 rounded p-1.5 text-zinc-600 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {deleteButton(entry.key, entry.name)}
          </li>
        ))}
        {skipped.map((skip) => (
          <li key={skip.uri} className="rounded border border-red-900/40 px-2 py-1.5">
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-red-300/80">
                {parseAtUri(skip.uri)?.rkey ?? skip.uri}
              </span>
              {deleteButton(skip.uri, skip.uri)}
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-red-400/80">
              {skip.reasons.map((reason) => (
                <li key={reason}>✗ {reason}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
