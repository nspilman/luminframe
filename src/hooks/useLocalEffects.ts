import { useEffect, useState } from 'react'
import { CustomEffectEntry, buildCustomEffectEntries } from './useCustomEffects'

/**
 * The effects/ authoring directory, loaded into the editor in dev only. The
 * glob module (localEffects) is reached exclusively through this dynamic
 * import behind the DEV check: production builds dead-code-eliminate it, and
 * jest never compiles the import.meta it contains.
 *
 * `ready` mirrors useCustomEffects' meaning: false only while loading, so the
 * registry can hold session restore until local keys are judgeable too.
 * In production it is immediately true — there is nothing to load.
 */
export interface LocalEffectsState {
  entries: CustomEffectEntry[]
  ready: boolean
}

export function useLocalEffects(): LocalEffectsState {
  const [state, setState] = useState<LocalEffectsState>({
    entries: [],
    ready: !import.meta.env.DEV,
  })

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let active = true
    import('@/lib/shaders/localEffects').then(({ localEffectRecords }) => {
      if (!active) return
      const { entries, skipped } = buildCustomEffectEntries(localEffectRecords)
      for (const skip of skipped) {
        console.warn(`Skipping local effect ${skip.uri}:`, skip.reasons)
      }
      setState({ entries, ready: true })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}
