/**
 * Always-on capture of the console and uncaught errors, so a failure on a
 * phone — where nobody can open devtools — can be read after the fact.
 * `debugReport()` renders everything captured plus the device's identity and
 * GPU limits as one pasteable text block; the CopyDebugLog button (shown with
 * ?debug=1) puts it on the clipboard.
 *
 * Capture always runs (an array of strings — the cost is nothing) because the
 * failure worth reading has usually already happened by the time anyone
 * decides to debug.
 */

const MAX_ENTRIES = 600
const MAX_ENTRY_LENGTH = 2000
const entries: string[] = []
const startedMs = Date.now()

function stamp(): string {
  return ((Date.now() - startedMs) / 1000).toFixed(2).padStart(7) + 's'
}

function fmt(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function push(level: string, args: unknown[]): void {
  entries.push(`[${stamp()}] ${level} ${args.map(fmt).join(' ')}`.slice(0, MAX_ENTRY_LENGTH))
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
}

for (const level of ['log', 'info', 'warn', 'error'] as const) {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    push(level.toUpperCase(), args)
    original(...args)
  }
}

window.addEventListener('error', (e) =>
  push('UNCAUGHT', [e.message, `${e.filename ?? '?'}:${e.lineno ?? '?'}`])
)
window.addEventListener('unhandledrejection', (e) => push('UNHANDLED-REJECTION', [e.reason]))

/** The machine this ran on, probed fresh at report time. */
function deviceContext(): string {
  const lines = [
    `ua: ${navigator.userAgent}`,
    `screen: ${screen.width}x${screen.height} @${window.devicePixelRatio}x, viewport ${window.innerWidth}x${window.innerHeight}`,
  ]
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory) lines.push(`deviceMemory: ${nav.deviceMemory}GB`)
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (gl) {
      lines.push(`webgl2 MAX_TEXTURE_SIZE: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`)
      lines.push(`webgl2 MAX_RENDERBUFFER_SIZE: ${gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)}`)
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      if (dbg) lines.push(`gpu: ${gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } else {
      lines.push('webgl2: UNAVAILABLE')
    }
  } catch (err) {
    lines.push(`webgl2 probe failed: ${String(err)}`)
  }
  return lines.join('\n')
}

export function debugErrorCount(): number {
  return entries.filter((e) => / (ERROR|UNCAUGHT|UNHANDLED-REJECTION) /.test(e)).length
}

export function debugReport(): string {
  return [
    `Luminframe debug report — ${new Date().toISOString()} — ${window.location.href}`,
    deviceContext(),
    `--- captured log (${entries.length} entries, newest last) ---`,
    entries.join('\n') || '(empty)',
  ].join('\n')
}

// A hatch for driving this from an attached inspector or automation.
;(window as Window & { __lfDebugReport?: () => string }).__lfDebugReport = debugReport
