/**
 * The Blocks language: a shader written as a vertical stack of small
 * operations. Each row's op consumes values — usually the previous row's
 * output ("current"), sometimes the untouched photo ("source") or an earlier
 * row it named (a tap) — and produces one typed value. The last row must
 * produce a color; the compiler turns the stack into one GLSL fragment body
 * that publishes as an ordinary effect.
 *
 * The grains are deliberately smaller than effects: noise, uv warps, channel
 * math, mixes — the operations effects are themselves made of. Composing
 * them makes shaders that have never existed, which is the whole point.
 */

/** The value types that flow between rows. */
export type BlockValueType = 'float' | 'vec2' | 'vec3'

/**
 * Where an op input comes from: the previous row's output, the source
 * photo's color at this pixel, or a named earlier row.
 */
export type ArgRef = 'current' | 'source' | { tap: string }

/** A knob's authored value, by kind: number (range), boolean (toggle), rgb (color). */
export type KnobValue = number | boolean | [number, number, number]

/** One row of the stack. */
export interface OpInstance {
  /** Catalog key of the operation. */
  op: string
  /** Wired inputs, by the op's arg names. Unwired args use the op's defaults. */
  args?: Record<string, ArgRef>
  /** Knob values, by the op's knob names. Unset knobs use the op's defaults. */
  knobs?: Record<string, KnobValue>
  /** Knob names exposed as published params (sliders for whoever applies it). */
  exposed?: string[]
  /** Name this row's output so later rows can reference it. */
  tap?: string
}

/** The whole program — what an effect record's `source` field carries as JSON. */
export interface ShaderSourceDoc {
  version: 1
  ops: OpInstance[]
}

export const BLOCKS_SOURCE_VERSION = 1

/** Enough for any real shader; keeps the compiled body far under MAX_BODY_LENGTH. */
export const MAX_BLOCKS = 32

/** One knob an op offers, described for both the compiler and the UI. */
export type KnobSpec =
  | { kind: 'range'; label: string; default: number; min: number; max: number; step: number }
  | { kind: 'toggle'; label: string; default: boolean }
  | { kind: 'color'; label: string; default: [number, number, number] }

/** One value input an op takes. */
export interface ArgSpec {
  type: BlockValueType
  /** Used when the author doesn't wire the arg. */
  default?: ArgRef
  /**
   * An optional arg may be left entirely unwired (no default either); the
   * emitter decides what that means — usually falling back to a knob.
   */
  optional?: boolean
}

/** What the emitter sees: every input resolved to a GLSL expression. */
export interface EmitCtx {
  /** The wired-or-defaulted expression for an arg; null only for optional args left unwired. */
  arg: (name: string) => string | null
  /** The knob's expression: the param uniform when exposed, a literal when baked. */
  knob: (name: string) => string
  /** The knob's authored value — for emitters that skip work a baked value can't do. */
  knobValue: (name: string) => KnobValue
  /** Whether the knob is a published param (so its value can change after compile). */
  isExposed: (name: string) => boolean
}

/** One operation in the catalog. */
export interface OpSpec {
  key: string
  name: string
  blurb: string
  /** The type this op's row produces. */
  out: BlockValueType
  args: Record<string, ArgSpec>
  knobs: Record<string, KnobSpec>
  /** Emit the row's value as a single GLSL expression of type `out`. */
  emit: (ctx: EmitCtx) => string
  /** Top-level helper GLSL this op needs, deduped across the program by identity. */
  helpers?: readonly string[]
}
