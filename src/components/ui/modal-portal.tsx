import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders a dialog at document.body. Necessary, not stylistic: dialogs composed
 * inside the canvas workspace sit under its overflow-hidden and backdrop-filter,
 * which make the workspace the containing block for position:fixed descendants —
 * so a "fullscreen" overlay rendered in place is silently clipped to the
 * workspace box (on a phone, the 45vh canvas, cutting off the dialog's own
 * buttons). The portal frees the overlay to actually mean the viewport.
 *
 * It also owns the other half of being modal: while mounted, the page behind
 * doesn't scroll. One home for the behavior, so no dialog can forget it.
 */
export function ModalPortal({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // The cast papers over @types/react 18.2's ReactPortal/ReactNode mismatch —
  // portals are valid JSX children at runtime.
  return createPortal(children, document.body) as unknown as JSX.Element
}
