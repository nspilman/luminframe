import { Textarea } from '@/components/ui/textarea'
import { BodyCompileError } from '@/lib/effectDraftValidation'

type GlslEditorProps = {
  body: string
  onChange: (body: string) => void
  grammarErrors: readonly string[]
  compileErrors: readonly BodyCompileError[]
  /** True between a change and its verdict — errors soften instead of flashing. */
  pending: boolean
}

/**
 * The shader body and its two judges: the grammar's named violations and the
 * GPU compiler's complaints, the latter located on the author's own lines.
 * Plain monospace text — the errors below are the tooling.
 */
export function GlslEditor({ body, onChange, grammarErrors, compileErrors, pending }: GlslEditorProps) {
  const clean = grammarErrors.length === 0 && compileErrors.length === 0
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <label htmlFor="glsl-body" className="text-xs text-zinc-400">
        Fragment body — reads <code className="text-zinc-300">imageTexture</code>,{' '}
        <code className="text-zinc-300">vUv</code>, <code className="text-zinc-300">time</code>,{' '}
        <code className="text-zinc-300">resolution</code> (the image&rsquo;s pixel size, not the
        canvas&rsquo;s), your params; writes <code className="text-zinc-300">gl_FragColor</code>
      </label>
      <Textarea
        id="glsl-body"
        value={body}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="min-h-[16rem] flex-1 resize-none font-mono text-xs leading-5"
      />
      <div
        aria-live="polite"
        className={`space-y-1 text-xs transition-opacity ${pending ? 'opacity-50' : ''}`}
      >
        {clean && <p className="text-emerald-400/80">Compiles clean.</p>}
        {grammarErrors.map((error, i) => (
          <p key={i} className="text-red-400">
            ✗ {error}
          </p>
        ))}
        {compileErrors.map((error, i) => (
          <p key={i} className="text-red-400">
            ✗ {error.bodyLine !== null ? `line ${error.bodyLine}: ` : ''}
            {error.message}
          </p>
        ))}
      </div>
    </div>
  )
}
