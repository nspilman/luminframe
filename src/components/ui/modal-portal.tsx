import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: ReactNode
  /**
   * Called when the user asks to leave via Escape. Optional because a caller
   * may need to refuse (e.g. a write in flight) — it passes a guard function
   * and decides there, not here.
   */
  onDismiss?: () => void
}

/**
 * The one home for being modal. Renders a dialog at document.body — necessary,
 * not stylistic: dialogs composed inside the canvas workspace sit under its
 * overflow-hidden and backdrop-filter, which make the workspace the containing
 * block for position:fixed descendants, silently clipping a "fullscreen"
 * overlay to the workspace box (on a phone, the 45vh canvas, cutting off the
 * dialog's own buttons).
 *
 * It also owns the behavior every dialog shares, so none can forget it: the
 * page behind doesn't scroll; Escape dismisses (when the caller allows);
 * focus moves into the dialog on open — unless a child's autoFocus already
 * claimed it — and returns to the opener on close.
 */
export function ModalPortal({ children, onDismiss }: ModalPortalProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const opener = document.activeElement as HTMLElement | null
    // Child autoFocus runs during commit, before this effect — so if focus is
    // already inside the dialog, leave it; otherwise land on the first control.
    const root = containerRef.current
    if (root && !root.contains(document.activeElement)) {
      root
        .querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        ?.focus()
    }

    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  useEffect(() => {
    if (!onDismiss) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  // The wrapper div only exists so focus handling has a root to query; the
  // overlays inside are position:fixed, so it never affects layout. The cast
  // papers over @types/react 18.2's ReactPortal/ReactNode mismatch — portals
  // are valid JSX children at runtime.
  return createPortal(<div ref={containerRef}>{children}</div>, document.body) as unknown as JSX.Element
}
