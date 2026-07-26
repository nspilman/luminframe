import { useEffect, useMemo } from 'react'
import { shaderLibrary } from '@/lib/shaders'
import { ApplicationContext } from '@/application/ApplicationContext'
import { EffectRegistry } from '@/types/shader'
import { useCustomEffects, CustomEffectEntry } from './useCustomEffects'
import { useLocalEffects } from './useLocalEffects'

/**
 * The one place the effect registry is assembled: builtins, the signed-in
 * user's published custom effects, and — in dev — the effects/ authoring
 * directory (local:// keys), so a shader is testable in the editor before it
 * is ever published. Everything that resolves a key — the editor hook, the
 * sidebar, recipe hydration — receives this registry, and the same custom
 * effects are mirrored into the ApplicationContext's shader repository so the
 * render path resolves the identical set.
 *
 * Local drafts lead the custom list: they are what's being worked on. Their
 * keys can't collide with published ones (local:// vs at://), so a published
 * effect and its local draft show side by side — visible, not deduped, since
 * the two bodies may genuinely differ mid-edit.
 *
 * `ready` is false only while either source is still loading. Signed out with
 * no dev directory, it is immediately true: the registry is just the
 * builtins, fully known.
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
  const { status, entries: published } = useCustomEffects(did)
  const { entries: local, ready: localReady } = useLocalEffects()

  const custom = useMemo(() => [...local, ...published], [local, published])

  const effectsByKey = useMemo(
    () => Object.fromEntries(custom.map((e) => [e.key, e.effect])),
    [custom]
  )

  useEffect(() => {
    ApplicationContext.getInstance().registerCustomEffects(effectsByKey)
  }, [effectsByKey])

  const registry = useMemo(() => ({ ...shaderLibrary, ...effectsByKey }), [effectsByKey])

  return useMemo(
    () => ({ registry, custom, ready: status !== 'loading' && localReady }),
    [registry, custom, status, localReady]
  )
}
