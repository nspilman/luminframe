import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      sm: "h-4 w-4",
      default: "h-6 w-6",
      lg: "h-10 w-10",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

/**
 * The one spinning shape the app shows for "working." Decorative by default
 * (`aria-hidden`) — pair it with visible status text, or override the aria props
 * for a standalone announced spinner.
 */
export function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <Loader2 aria-hidden className={cn(spinnerVariants({ size }), className)} {...props} />
  )
}

export interface LoadingOverlayProps {
  /** When false, renders nothing — the area shows its normal content. */
  show: boolean
  /** Announced and shown beneath the spinner. */
  label?: string
  className?: string
}

/**
 * The reusable "this whole area is loading" cover: a centered spinner over a
 * dimmed backdrop, sized to its positioned parent. Drop it inside any
 * `relative` container and toggle `show` from a useAsyncStatus `isPending`.
 */
export function LoadingOverlay({ show, label = "Loading", className }: LoadingOverlayProps) {
  if (!show) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm",
        className
      )}
    >
      <Spinner size="lg" className="text-violet-300" />
      <p className="text-sm text-zinc-300">{label}</p>
    </div>
  )
}
