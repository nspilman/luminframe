import { Image } from '@/domain/models/Image'
import { ShaderEffect, ShaderInputVars } from '@/types/shader'

/**
 * What a published recipe can and cannot carry — the two honesty checks
 * around the recipe's known limits.
 *
 * A recipe names effects by key and stores knob values, but two kinds of
 * state can't survive publishing: a draft:// or local:// key points into
 * this browser's storage (meaningless in a permanent public record), and an
 * image slot's pixels are never serialized (an unfilled slot renders as a
 * black texture by the env contract). The first blocks publishing; the
 * second earns a visible cue.
 */

/**
 * The first effect key in the stack that only exists in this browser, or
 * null when every key is publishable. draft:// is a creator draft in
 * localStorage; local:// is the dev authoring directory. Published records
 * already exist in the wild with dangling draft:// keys — this predicate is
 * what keeps it from happening again.
 */
export function browserOnlyEffectKey(keys: readonly string[]): string | null {
  return keys.find((k) => k.startsWith('draft://') || k.startsWith('local://')) ?? null
}

/** The slug half of a draft:// or local:// key, for naming it in a message. */
export function browserOnlySlug(key: string): string {
  return key.slice(key.indexOf('://') + 3)
}

/**
 * Labels of the effect's declared image slots (never the host-provided
 * imageTexture) that currently hold no picture. Empty slots render as black
 * by contract — this names them so the UI can say so instead of leaving the
 * user to wonder why the effect looks wrong.
 */
export function missingImageSlots(effect: ShaderEffect, params: ShaderInputVars): string[] {
  return Object.entries(effect.inputs)
    .filter(
      ([name, input]) =>
        input.type === 'image' && name !== 'imageTexture' && !(params[name] instanceof Image)
    )
    .map(([, input]) => input.label)
}
