import { useEffect, useMemo } from 'react'
import { shaderLibrary } from '@/lib/shaders'
import { ApplicationContext } from '@/application/ApplicationContext'
import { EffectRegistry } from '@/types/shader'
import { useCustomEffects, CustomEffectEntry } from './useCustomEffects'

/**
 * The one place the effect registry is assembled: builtins merged with the
 * signed-in user's loaded custom effects. Everything that resolves a key —
 * the editor hook, the sidebar, recipe hydration — receives this registry,
 * and the same custom effects are mirrored into the ApplicationContext's
 * shader repository so the render path resolves the identical set.
 *
 * `ready` is false only while a fetch is in flight. Signed out (did === null)
 * is immediately ready: the registry is just the builtins, fully known.
 *
 * Mirroring is registration-only: signing out empties the React registry (the
 * picker stops offering custom effects) but leaves stale entries registered in
 * the repository. That is deliberate slack, not a leak — an applied custom
 * effect still on the pipeline keeps rendering until the pipeline drops it.
 */
export interface EffectRegistryState {
  registry: EffectRegistry
  custom: CustomEffectEntry[]
  ready: boolean
}

export function useEffectRegistry(did: string | null): EffectRegistryState {
  const { status, entries } = useCustomEffects(did)

  const effectsByKey = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.key, e.effect])),
    [entries]
  )

  useEffect(() => {
    ApplicationContext.getInstance().registerCustomEffects(effectsByKey)
  }, [effectsByKey])

  const registry = useMemo(() => ({ ...shaderLibrary, ...effectsByKey }), [effectsByKey])

  return useMemo(
    () => ({ registry, custom: entries, ready: status !== 'loading' }),
    [registry, entries, status]
  )
}
