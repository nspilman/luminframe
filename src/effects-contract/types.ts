/**
 * The two forms of an effect record, kept deliberately distinct (the same
 * split as RecipeStep/RawRecipeStep in the app):
 *
 *   - EffectDefinition: the validated, structured form both sides work with —
 *     what an author writes and what the app hydrates into a ShaderEffect.
 *   - EffectRecordWire: what actually sits on the PDS. `params` is a
 *     JSON-encoded string because the atproto data model has no float type
 *     and param defaults/bounds are fractional — the same precedent as
 *     com.luminframe.image's effectStep.params.
 */

export interface RangeParamDef {
  type: 'range'
  name: string
  label: string
  default: number
  min: number
  max: number
  step: number
}

export interface ColorParamDef {
  type: 'color'
  name: string
  label: string
  /** RGB, each component 0..1. */
  default: [number, number, number]
}

export interface BooleanParamDef {
  type: 'boolean'
  name: string
  label: string
  default: boolean
}

export interface Vec2ParamDef {
  type: 'vec2'
  name: string
  label: string
  default: [number, number]
  /**
   * Track bounds, present when the pair is a normalized point rather than a
   * pixel count — without them a 0..1 position renders on the fallback 0–100
   * track and flies off the picture at the first nudge. Declaring bounds is
   * an env-2 capability (env-1 clients ignore them). All three travel
   * together or not at all.
   */
  min?: [number, number]
  max?: [number, number]
  step?: [number, number]
  labels?: [string, string]
}

/**
 * An image slot (env 2). No default — an unfilled slot is a black texture by
 * contract, and effects are written to degrade gracefully against black
 * (e.g. Displacement treats a black map as identity).
 */
export interface ImageParamDef {
  type: 'image'
  name: string
  label: string
}

/**
 * Typed text rendered onto a texture (env 2). The GLSL side sees a sampler2D
 * whose alpha channel carries the glyphs; the editor side sees a textarea.
 */
export interface TextParamDef {
  type: 'text'
  name: string
  label: string
  default: string
  placeholder?: string
}

export type EffectParamDef =
  | RangeParamDef
  | ColorParamDef
  | BooleanParamDef
  | Vec2ParamDef
  | ImageParamDef
  | TextParamDef

export interface EffectDefinition {
  name: string
  description?: string
  env: number
  params: EffectParamDef[]
  body: string
  /** Name of the range param that gates motion (0 ⇒ still); see the env contract. */
  animatedBy?: string
}

export interface EffectRecordWire {
  $type: 'com.luminframe.effect'
  name: string
  description?: string
  env: number
  /** JSON-encoded EffectParamDef[] — see module comment. */
  params: string
  body: string
  animatedBy?: string
  createdAt: string
}
