import { Minus } from 'lucide-react'

/**
 * The two halves of "this panel can get out of the way", named once so every
 * surface that offers it offers the same gesture: a minimize control that folds
 * a panel, and the rail it folds into — its title turned on its side, clickable
 * to bring it back.
 *
 * Only the motif is shared. Placement and skin are the caller's: the creator's
 * rails are bordered cards floating among cards, the editor's are flush strips
 * against the canvas, and the editor hides both on phones where the canvas
 * already leads. Forcing one expanded layout on both would be a false symmetry —
 * the editor's columns carry their own headers, with search and jump chips in
 * them, and the creator's carry a plain title bar.
 */

export function MinimizeButton({
  label,
  onMinimize,
  className = '',
}: {
  label: string
  onMinimize: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onMinimize}
      aria-label={`Minimize ${label}`}
      className={`rounded p-1 text-zinc-600 hover:text-zinc-300 ${className}`}
    >
      <Minus className="h-3.5 w-3.5" />
    </button>
  )
}

export function PanelRail({
  label,
  onExpand,
  className = '',
}: {
  label: string
  onExpand: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${label}`}
      className={`flex items-center justify-center text-xs text-zinc-500 hover:text-zinc-300 ${className}`}
    >
      <span className="md:[writing-mode:vertical-rl]">{label}</span>
    </button>
  )
}
