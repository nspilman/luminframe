import { buildEffectRecord, EffectDefinition, minimalEnvFor } from '@/effects-contract'
import { RawEffectRecord } from '@/infrastructure/atproto/effectRecords'

/**
 * The dev-time bridge from the authoring directory into the editor: every
 * effects/<slug>/ (effect.json + body.glsl) becomes a record keyed
 * `local://<slug>`, so a shader can be written, seen, and tuned on a real
 * image before any credentials or publishing exist. What you test is what
 * ships — the publish script assembles the identical wire record from the
 * identical directory.
 *
 * These are records, not effects: they enter the editor through the exact
 * pipeline network records do (parseEffectRecord → hydrate → compile gate in
 * buildCustomEffectEntries), so the casts below can't smuggle a malformed
 * authoring file past the grammar — it gets skipped with named reasons, the
 * same as a bad record off the network.
 *
 * Caveat worth knowing: an image saved while a local effect is applied
 * records `local://<slug>` in its recipe, which nothing outside this dev
 * machine can resolve (viewers drop the step). Publish the effect first when
 * the save is meant to be real.
 *
 * This module contains import.meta.glob and must stay out of the jest import
 * graph — it is reached only via dynamic import behind an import.meta.env.DEV
 * check (see useLocalEffects).
 */

const metas = import.meta.glob('../../../effects/*/effect.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>
const bodies = import.meta.glob('../../../effects/*/body.glsl', {
  eager: true,
  as: 'raw',
}) as unknown as Record<string, string>

const slugOf = (path: string): string => path.split('/').slice(-2)[0]

export const localEffectRecords: RawEffectRecord[] = Object.entries(metas).map(([path, mod]) => {
  const meta = mod.default
  const body = bodies[path.replace('effect.json', 'body.glsl')] ?? ''
  return {
    uri: `local://${slugOf(path)}`,
    value: buildEffectRecord(
      {
        name: meta.name,
        description: meta.description,
        env: minimalEnvFor((meta.params ?? []) as EffectDefinition['params']),
        params: meta.params ?? [],
        body,
        animatedBy: meta.animatedBy,
      } as EffectDefinition,
      new Date().toISOString()
    ),
  }
})
