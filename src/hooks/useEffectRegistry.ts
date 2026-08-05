import { useEffect, useMemo } from 'react'
import { shaderLibrary } from '@/lib/shaders'
import { ApplicationContext } from '@/application/ApplicationContext'
import { EffectRegistry } from '@/types/shader'
import { useCustomEffects, CustomEffectEntry } from './useCustomEffects'
import { useDraftEffects } from './useDraftEffects'
import { useLocalEffects } from './useLocalEffects'
import { useForeignEffects } from './useForeignEffects'
import { useNetworkEffects, NetworkEffectsState } from './useNetworkEffects'

/**
 * The one place the effect registry is assembled: builtins, the signed-in
 * user's published custom effects, the Effect Creator's saved drafts
 * (draft:// keys, any build), other authors' effects resolved on demand
 * (foreign at:// keys, from shared recipes), and — in
 * dev — the effects/ authoring directory (local:// keys). Everything that
 * resolves a key — the editor hook, the sidebar, recipe hydration — receives
 * this registry, and the same custom effects are mirrored into the
 * ApplicationContext's shader repository so the render path resolves the
 * identical set. Foreign effects join the registry but not `custom` — the
 * picker's Yours section stays the user's own.
 *
 * Works-in-progress lead the custom list: they are what's being worked on.
 * The three schemes (local://, draft://, at://) can't collide, so a
 * published effect and its in-progress twin show side by side — visible, not
 * deduped, since the bodies may genuinely differ mid-edit.
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
  /**
   * Everyone else's published effects, and the control to go get them. Loaded
   * on demand, so this is empty (and `ready` unaffected) until a surface asks —
   * browsing the network is a choice, not part of starting the editor.
   */
  network: NetworkEffectsState
  ready: boolean
  /** Published records that failed the pipeline — the creator's fix list. */
  publishedSkipped: Array<{ uri: string; reasons: string[] }>
  /** Re-fetch the published effects (after a publish or delete). */
  refreshPublished: () => void
}

export function useEffectRegistry(did: string | null): EffectRegistryState {
  const { status, entries: published, skipped: publishedSkipped, refresh: refreshPublished } = useCustomEffects(did)
  const { entries: local, ready: localReady } = useLocalEffects()
  const drafts = useDraftEffects()

  const custom = useMemo(() => [...local, ...drafts, ...published], [local, drafts, published])
  const foreign = useForeignEffects()
  const network = useNetworkEffects()

  // Network effects join the registry — applying one has to resolve its key like
  // any other — but not `custom`, which stays the user's own. `custom` before
  // `network` so your version of a key wins over the copy that came back in the
  // network listing.
  const effectsByKey = useMemo(
    () => Object.fromEntries([...foreign, ...network.entries, ...custom].map((e) => [e.key, e.effect])),
    [custom, foreign, network.entries]
  )

  useEffect(() => {
    ApplicationContext.getInstance().registerCustomEffects(effectsByKey)
  }, [effectsByKey])

  const registry = useMemo(() => ({ ...shaderLibrary, ...effectsByKey }), [effectsByKey])

  return useMemo(
    () => ({ registry, custom, network, ready: status !== 'loading' && localReady, publishedSkipped, refreshPublished }),
    [registry, custom, network, status, localReady, publishedSkipped, refreshPublished]
  )
}
