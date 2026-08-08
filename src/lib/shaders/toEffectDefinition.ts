import { Color } from '@/domain/value-objects/Color'
import { EffectDefinition, EffectParamDef, minimalEnvFor } from '@/effects-contract'
import { ShaderEffect, ShaderInputDefinition, ShaderType } from '@/types/shader'
import { blurbOf } from './catalog'

/**
 * The publish direction of the codec: a bundled ShaderEffect back to the
 * EffectDefinition a com.luminframe.effect record carries. The inverse of
 * customEffects' variableFor — hydrateEffectDefinition(toEffectDefinition(e))
 * must reproduce the builtin, and the keystone test walks the whole library
 * proving it. Records are GENERATED from the shipped code by this function,
 * never hand-copied, so the repo stays the single source of truth.
 *
 * Skipped inputs are the host-provided vocabulary, not params: imageTexture
 * (the pass input), and opacity/resolution (injected by createShaderRecord —
 * they appear in declarationVars but never in inputs, so filtering inputs
 * already excludes them; imageTexture is the one input that must be named).
 */

function paramFor(
  name: string,
  input: ShaderInputDefinition,
  defaultValue: unknown
): EffectParamDef {
  const base = { name, label: input.label }
  switch (input.type) {
    case 'range':
      return {
        type: 'range',
        ...base,
        default: defaultValue as number,
        min: input.min,
        max: input.max,
        step: input.step,
      }
    case 'color': {
      // .r/.g/.b, not toFloat32Array(): the record must carry the author's
      // numbers exactly — float32 truncates 0.52 to 0.5199999809…, and the
      // round-trip test would (rightly) call that a different effect.
      const c = defaultValue as Color
      return { type: 'color', ...base, default: [c.r, c.g, c.b] }
    }
    case 'boolean':
      return { type: 'boolean', ...base, default: defaultValue as boolean }
    case 'vec2': {
      const [x, y] = defaultValue as [number, number]
      return {
        type: 'vec2',
        ...base,
        default: [x, y],
        ...(input.min && input.max && input.step
          ? { min: input.min, max: input.max, step: input.step, ...(input.labels ? { labels: input.labels } : {}) }
          : {}),
      }
    }
    case 'image':
      return { type: 'image', ...base }
    case 'text':
      return {
        type: 'text',
        ...base,
        default: defaultValue as string,
        ...(input.placeholder ? { placeholder: input.placeholder } : {}),
      }
  }
}

export function toEffectDefinition(key: ShaderType, effect: ShaderEffect): EffectDefinition {
  if (!effect.rawBody) {
    throw new Error(`${key}: no rawBody — only createShaderRecord effects can become records`)
  }
  const params = Object.entries(effect.inputs)
    // imageTexture is the pass input; opacity is the free layer-strength
    // control createShaderRecord injects into every effect's inputs. Neither
    // is the author's param, and a record redeclaring either is invalid.
    .filter(([name]) => name !== 'imageTexture' && name !== 'opacity')
    .map(([name, input]) => paramFor(name, input, effect.defaultValues[name]))
  return {
    name: effect.name,
    description: blurbOf(key),
    env: minimalEnvFor(params),
    params,
    body: effect.rawBody,
    ...(effect.animatedBy ? { animatedBy: effect.animatedBy } : {}),
  }
}

/**
 * The record key a builtin publishes under: its camelCase registry key in
 * kebab-case (blackAndWhite → black-and-white), which satisfies
 * EFFECT_SLUG_PATTERN. Alias resolution reverses this to fold the published
 * name back onto the bundled effect.
 */
export function slugForEffectKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * The app's own atproto account (handle: luminframe.com) — the repo the
 * builtin library publishes to, so every effect has a stable, citable
 * at:// name. Resolution treats a URI in this repo as an alias for the
 * bundled effect: same DID + a slug slugForEffectKey produces → the builtin,
 * no fetch, no compile-gate, works offline.
 */
export const LUMINFRAME_DID = 'did:plc:5mo4amsmatgfmzpeqqsuetot'
