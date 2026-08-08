import { EFFECT_COLLECTION } from '@/effects-contract'
import { EffectRegistry, ShaderType } from '@/types/shader'
import { fetchRecordByUri, RawRecord } from '@/infrastructure/atproto/repoRecords'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { CustomEffectEntry, buildCustomEffectEntries } from '@/hooks/useCustomEffects'
import { shaderLibrary } from '@/lib/shaders'
import { blurbOf } from './catalog'
import { LUMINFRAME_DID, slugForEffectKey, toEffectDefinition } from './toEffectDefinition'

/**
 * Other authors' effects, resolved on demand. A Look (or a shared image's
 * recipe) may reference at:// effects the local registry doesn't hold —
 * anyone's, not just the signed-in user's. Resolving fetches each record once
 * and runs it through the identical parse → hydrate → compile pipeline as
 * every other source, so a foreign effect can't bypass the grammar either.
 *
 * Resolved entries live in a module cache and are announced with one event;
 * useForeignEffects folds them into the registry, so the render path, the
 * hydrator, and macro bounds all see them the same way.
 */

const cache = new Map<string, CustomEffectEntry | { reasons: string[] }>()

/** slug → builtin key, the inverse of slugForEffectKey over the library. */
const builtinBySlug = new Map(
  (Object.keys(shaderLibrary) as ShaderType[]).map((key) => [slugForEffectKey(key), key])
)

/**
 * A luminframe.com effect URI is the published name of a bundled builtin —
 * the records are generated from the shipped code (scripts/publish-builtins),
 * so the bundled effect IS the record's content. Resolving it locally keeps
 * the same center written once: no fetch, no compile-gate, works offline,
 * and a recipe naming the at:// form renders identically to one naming the
 * short key. Unknown slugs fall through to a real fetch — luminframe.com may
 * publish effects that postdate this build.
 */
function builtinAliasEntry(key: string): CustomEffectEntry | null {
  const parsed = parseAtUri(key)
  if (parsed?.did !== LUMINFRAME_DID || parsed.collection !== EFFECT_COLLECTION) return null
  const builtinKey = builtinBySlug.get(parsed.rkey)
  if (!builtinKey) return null
  const effect = shaderLibrary[builtinKey]
  return { key, effect, description: blurbOf(builtinKey), def: toEffectDefinition(builtinKey, effect) }
}

export const FOREIGN_EFFECTS_CHANGED_EVENT = 'luminframe.foreignEffects.changed'

/** Every foreign effect resolved so far, registry-ready. */
export function foreignEffectEntries(): CustomEffectEntry[] {
  return [...cache.values()].filter((v): v is CustomEffectEntry => 'effect' in v)
}

/** True for a key this module could resolve: an at:// effect-collection URI. */
function isForeignEffectKey(key: string, registry: EffectRegistry): boolean {
  return (
    !(key in registry) &&
    !cache.has(key) &&
    parseAtUri(key)?.collection === EFFECT_COLLECTION
  )
}

/**
 * Fetch and validate every unresolved at:// effect among the step keys.
 * Returns the keys that stayed unresolvable, with their named reasons; the
 * resolved land in the cache (and, via the change event, the registry).
 */
export async function resolveForeignEffects(
  stepKeys: readonly string[],
  registry: EffectRegistry,
  fetchRecord: (uri: string) => Promise<RawRecord | null> = fetchRecordByUri
): Promise<{ unresolved: Array<{ key: string; reasons: string[] }> }> {
  const wanted = [...new Set(stepKeys)].filter((key) => isForeignEffectKey(key, registry))
  if (wanted.length > 0) {
    await Promise.all(
      wanted.map(async (key) => {
        const alias = builtinAliasEntry(key)
        if (alias) {
          cache.set(key, alias)
          return
        }
        const record = await fetchRecord(key)
        if (!record) {
          cache.set(key, { reasons: ['record not found (deleted, or its PDS is unreachable)'] })
          return
        }
        const { entries, skipped } = buildCustomEffectEntries([record])
        cache.set(key, entries[0] ?? { reasons: skipped[0]?.reasons ?? ['record failed validation'] })
      })
    )
    window.dispatchEvent(new Event(FOREIGN_EFFECTS_CHANGED_EVENT))
  }
  const unresolved: Array<{ key: string; reasons: string[] }> = []
  for (const key of stepKeys) {
    const cached = cache.get(key)
    if (cached && 'reasons' in cached) unresolved.push({ key, reasons: cached.reasons })
  }
  return { unresolved }
}

/**
 * The registry plus everything resolved so far — what an apply-path hydrates
 * against right after awaiting resolveForeignEffects (the React registry
 * catches up a render later via useForeignEffects).
 */
export function registryWithForeign(registry: EffectRegistry): EffectRegistry {
  return {
    ...registry,
    ...Object.fromEntries(foreignEffectEntries().map((e) => [e.key, e.effect])),
  }
}
