import { useEffect, useState } from 'react'
import { parseEffectRecord } from '@/effects-contract'
import { hydrateEffectDefinition } from '@/lib/shaders/customEffects'
import { checkEffectCompiles, CompileCheck } from '@/lib/shaders/compileCheck'
import { fetchRepoEffectRecords, RawEffectRecord } from '@/infrastructure/atproto/effectRecords'
import { EffectKey, ShaderEffect } from '@/types/shader'

/**
 * The signed-in user's custom effects, loaded from their com.luminframe.effect
 * records and made editor-ready. The hook is a thin fetch shell around
 * buildCustomEffectEntries — the pure pipeline where a raw record either
 * becomes an effect or is skipped with named reasons.
 */

export interface CustomEffectEntry {
  /** The record's AT-URI — the key this effect lives under everywhere. */
  key: EffectKey
  effect: ShaderEffect
  /** The record's blurb, shown on the library card. */
  description?: string
}

export interface CustomEffectsState {
  status: 'idle' | 'loading' | 'loaded'
  entries: CustomEffectEntry[]
}

/**
 * Raw records → editor-ready entries: validate against the grammar, hydrate
 * through the builtin factory, then compile-gate the GLSL. A record failing
 * any stage is skipped with its reasons — one bad shader must never take the
 * library down with it. A compile check of 'unavailable' (no WebGL in this
 * environment) passes: the grammar already vouched for the record's shape,
 * and the render path's console error remains the runtime backstop.
 */
export function buildCustomEffectEntries(
  records: RawEffectRecord[],
  compile: (effect: ShaderEffect) => CompileCheck = checkEffectCompiles
): { entries: CustomEffectEntry[]; skipped: Array<{ uri: string; reasons: string[] }> } {
  const entries: CustomEffectEntry[] = []
  const skipped: Array<{ uri: string; reasons: string[] }> = []
  for (const record of records) {
    const parsed = parseEffectRecord(record.value)
    if (!parsed.ok) {
      skipped.push({ uri: record.uri, reasons: parsed.errors })
      continue
    }
    const effect = hydrateEffectDefinition(parsed.def)
    const check = compile(effect)
    if (check.status === 'failed') {
      skipped.push({ uri: record.uri, reasons: [`GLSL failed to compile: ${check.log}`] })
      continue
    }
    entries.push({
      key: record.uri,
      effect,
      ...(parsed.def.description ? { description: parsed.def.description } : {}),
    })
  }
  return { entries, skipped }
}

export function useCustomEffects(did: string | null): CustomEffectsState {
  const [state, setState] = useState<CustomEffectsState>({ status: 'idle', entries: [] })

  useEffect(() => {
    if (!did) {
      setState({ status: 'idle', entries: [] })
      return
    }
    let active = true
    setState({ status: 'loading', entries: [] })
    fetchRepoEffectRecords(did).then((records) => {
      if (!active) return
      const { entries, skipped } = buildCustomEffectEntries(records)
      for (const skip of skipped) {
        console.warn(`Skipping effect record ${skip.uri}:`, skip.reasons)
      }
      setState({ status: 'loaded', entries })
    })
    return () => {
      active = false
    }
  }, [did])

  return state
}
