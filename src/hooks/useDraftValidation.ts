import { useEffect, useState } from 'react'
import { EffectDefinition } from '@/effects-contract'
import { DraftValidation, validateDraftDef } from '@/lib/effectDraftValidation'

const EMPTY: DraftValidation = { grammarErrors: [], compile: null, effect: null }

/**
 * The live judgment of the draft being authored: validateDraftDef, re-run a
 * beat after the last keystroke rather than on every one — the compile check
 * spins up a WebGL context, cheap once but not per character. `pending` is
 * true between a change and its verdict, so the UI can soften stale errors
 * instead of flashing them against text that has already moved on.
 */
export function useDraftValidation(
  def: EffectDefinition | null,
  delayMs = 200
): DraftValidation & { pending: boolean } {
  const [result, setResult] = useState<DraftValidation>(EMPTY)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!def) {
      setResult(EMPTY)
      setPending(false)
      return
    }
    setPending(true)
    const timer = setTimeout(() => {
      setResult(validateDraftDef(def))
      setPending(false)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [def, delayMs])

  return { ...result, pending }
}
