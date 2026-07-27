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
}

export type EffectParamDef = RangeParamDef | ColorParamDef | BooleanParamDef | Vec2ParamDef

export interface EffectDefinition {
  name: string
  description?: string
  env: number
  params: EffectParamDef[]
  body: string
  /** Name of the range param that gates motion (0 ⇒ still); see the env contract. */
  animatedBy?: string
  /**
   * The higher-level source this effect was compiled from (the Blocks
   * editor's term JSON), carried so the shader can be reopened at the level
   * it was written. The body remains the truth — the grammar never interprets
   * this beyond its shape.
   */
  source?: string
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
  /** JSON-encoded Blocks term doc — see EffectDefinition.source. */
  source?: string
  createdAt: string
}
