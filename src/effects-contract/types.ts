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

/*
 * The two forms of a recipe record (a "Look"), split the same way: a
 * validated definition for both sides to work with, and a wire form whose
 * fractional values ride as JSON strings.
 */

/** A step param value — the same shapes the image record's recipe steps carry. */
export type StepParamValue = number | string | boolean | number[]

/**
 * One step of the chain. The field is named `type` (not `effect`) to match
 * the image record's #effectStep and the app's RawRecipeStep, so a Look's
 * steps hydrate through the same codec as a saved image's recipe.
 */
export interface RecipeStepDef {
  /** A builtin effect key or an at:// URI of a com.luminframe.effect record. */
  type: string
  params?: Record<string, StepParamValue>
}

/**
 * One binding of a macro knob into the chain: the knob's normalized value
 * t ∈ [0, 1] lands on the named param as lerp(from, to, t). When from/to are
 * omitted the effect's own param bounds are used — which only the loaded
 * effect knows, so filling them in is apply-time work, not grammar.
 */
export interface MacroBinding {
  step: number
  param: string
  from?: number
  to?: number
}

/** A named knob the Look's author exposes; one knob may drive many params. */
export interface MacroDef {
  name: string
  label: string
  /** Starting position, 0..1. */
  default: number
  bindings: MacroBinding[]
}

export interface RecipeDefinition {
  name: string
  description?: string
  steps: RecipeStepDef[]
  macros?: MacroDef[]
}

export interface RecipeStepWire {
  type: string
  /** JSON-encoded params object — see module comment. */
  params?: string
}

export interface RecipeRecordWire {
  $type: 'com.luminframe.recipe'
  name: string
  description?: string
  steps: RecipeStepWire[]
  /** JSON-encoded MacroDef[] — see module comment. */
  macros?: string
  createdAt: string
}
