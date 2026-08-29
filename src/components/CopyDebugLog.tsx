import { useState } from 'react'
import { debugReport, debugErrorCount } from '@/lib/debugLog'

/**
 * The phone-sized escape hatch for "my only test device is a phone": with
 * ?debug=1 in the address, a fixed button copies the captured console + device
 * report to the clipboard in one tap. If the clipboard refuses (some embedded
 * webviews), the report opens in a textarea to select by hand instead —
 * getting the log out must not itself have a failure mode that hides logs.
 */
export function CopyDebugLog() {
  const [copied, setCopied] = useState(false)
  const [fallbackText, setFallbackText] = useState<string | null>(null)

  if (!new URLSearchParams(window.location.search).has('debug')) return null

  const copy = async () => {
    const report = debugReport()
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFallbackText(report)
    }
  }

  const errors = debugErrorCount()
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="fixed bottom-3 left-3 z-[100] rounded-lg border border-amber-500/50 bg-amber-950/90 px-3 py-2 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-sm"
      >
        {copied ? 'Copied ✓' : `Copy debug log${errors > 0 ? ` (${errors} errors)` : ''}`}
      </button>
      {fallbackText && (
        <div className="fixed inset-4 z-[101] flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-950 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Clipboard unavailable — select all and copy:</span>
            <button type="button" onClick={() => setFallbackText(null)} className="text-xs text-zinc-400">
              Close
            </button>
          </div>
          <textarea
            readOnly
            value={fallbackText}
            onFocus={(e) => e.target.select()}
            className="min-h-0 flex-1 rounded-md bg-black p-2 font-mono text-[10px] text-zinc-300"
          />
        </div>
      )}
    </>
  )
}
