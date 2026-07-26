import { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders a dialog at document.body. Necessary, not stylistic: dialogs composed
 * inside the canvas workspace sit under its overflow-hidden and backdrop-filter,
 * which make the workspace the containing block for position:fixed descendants —
 * so a "fullscreen" overlay rendered in place is silently clipped to the
 * workspace box (on a phone, the 45vh canvas, cutting off the dialog's own
 * buttons). The portal frees the overlay to actually mean the viewport.
 */
export function ModalPortal({ children }: { children: ReactNode }): JSX.Element {
  // The cast papers over @types/react 18.2's ReactPortal/ReactNode mismatch —
  // portals are valid JSX children at runtime.
  return createPortal(children, document.body) as unknown as JSX.Element
}
