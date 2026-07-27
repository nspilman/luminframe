import { EffectDefinition, buildEffectRecord, parseEffectRecord } from '@/effects-contract'
import { hydrateEffectDefinition } from '@/lib/shaders/customEffects'
import { checkEffectCompiles, CompileCheck } from '@/lib/shaders/compileCheck'
import { ShaderEffect } from '@/types/shader'

/**
 * The Effect Creator's judgment of a draft, derived in one pass: the grammar's
 * verdict (every named violation, not just the first), then — only for a
 * grammatically sound draft — the GPU compiler's. This is the same
 * build → parse → hydrate → compile pipeline records take on their way into
 * the registry, so what the creator calls valid is exactly what the editor
 * will accept.
 */
export interface DraftValidation {
  grammarErrors: string[]
  /** Null until the grammar passes — an unparseable draft never reaches the compiler. */
  compile: CompileCheck | null
  /** The live effect, present only when both judges pass ('unavailable' counts as a pass). */
  effect: ShaderEffect | null
}

export function validateDraftDef(
  def: EffectDefinition,
  compile: (effect: ShaderEffect) => CompileCheck = checkEffectCompiles
): DraftValidation {
  // The createdAt stamp is irrelevant to validity; any fixed value serves.
  const parsed = parseEffectRecord(buildEffectRecord(def, '1970-01-01T00:00:00.000Z'))
  if (!parsed.ok) {
    return { grammarErrors: parsed.errors, compile: null, effect: null }
  }
  const effect = hydrateEffectDefinition(parsed.def)
  const check = compile(effect)
  return {
    grammarErrors: [],
    compile: check,
    effect: check.status === 'failed' ? null : effect,
  }
}

/** One GLSL compiler complaint, located in the author's own body text. */
export interface BodyCompileError {
  /** 1-indexed line in the body the author typed, or null when unmappable. */
  bodyLine: number | null
  message: string
}

/**
 * Map a WebGL compile log back to the author's body lines. The compiled
 * source prepends, in order: the precision qualifier, `varying vec2 vUv;`,
 * `uniform float time;`, `uniform sampler2D prevFrame;` (4 fixed lines), one
 * uniform declaration per declarationVar (K lines), and `vec4 lfFragColor;`
 * from the opacity wrap — so assembled line N is the author's line N − 5 − K.
 * A message pointing outside the body (into the preamble or the generated
 * main) keeps a null line rather than lying about a location.
 */
export function bodyLinesFromCompileLog(log: string, declarationVarCount: number): BodyCompileError[] {
  const offset = 5 + declarationVarCount
  const errors: BodyCompileError[] = []
  for (const line of log.split('\n')) {
    const match = line.match(/ERROR:\s*\d+:(\d+):\s*(.*)/)
    if (!match) continue
    const assembled = Number(match[1])
    const bodyLine = assembled - offset
    errors.push({ bodyLine: bodyLine >= 1 ? bodyLine : null, message: match[2].trim() })
  }
  return errors
}
