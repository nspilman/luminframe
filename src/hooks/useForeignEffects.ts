import { useEffect, useState } from 'react'
import { CustomEffectEntry } from './useCustomEffects'
import {
  FOREIGN_EFFECTS_CHANGED_EVENT,
  foreignEffectEntries,
} from '@/lib/shaders/foreignEffects'

/**
 * Other authors' effects resolved so far, as a registry source — re-read
 * whenever the resolver announces a change (the draft-effects idiom).
 */
export function useForeignEffects(): CustomEffectEntry[] {
  const [entries, setEntries] = useState<CustomEffectEntry[]>(() => foreignEffectEntries())

  useEffect(() => {
    const onChange = () => setEntries(foreignEffectEntries())
    window.addEventListener(FOREIGN_EFFECTS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(FOREIGN_EFFECTS_CHANGED_EVENT, onChange)
  }, [])

  return entries
}
