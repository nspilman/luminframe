import { Image } from '@/domain/models/Image'
import { Color } from '@/domain/value-objects/Color'

/**
 * Shader input variables containing parameter values.
 * All values are domain types - no infrastructure dependencies.
 *
 * Note: Image domain objects will be converted to textures by the rendering adapter.
 */
export type ShaderInputVars = Record<string, string | number | number[] | Image | Color | null | Float32Array | boolean>

/**
 * The descriptor for one editable shader input — what control to show and its
 * bounds. A discriminated union on `type`: each kind carries exactly the fields
 * its control needs (a range has min/max/step; an image just a label), so a
 * `param.type === 'range'` check narrows to the fields that exist. This is the
 * single source of truth for input shapes — the shaderConfig builder produces
 * these, ShaderEffect.inputs holds them, and the parameter renderers consume
 * them (see parameters/types.ts) without re-asserting their shape.
 */
export interface RangeInputDefinition {
  type: 'range'
  label: string
  min: number
  max: number
  step: number
}

export interface Vec2InputDefinition {
  type: 'vec2'
  label: string
  min?: [number, number]
  max?: [number, number]
  step?: [number, number]
  labels?: [string, string]
}

export interface ColorInputDefinition {
  type: 'color'
  label: string
}

export interface ImageInputDefinition {
  type: 'image'
  label: string
}

export interface BooleanInputDefinition {
  type: 'boolean'
  label: string
}

/**
 * Typed text. The value is a plain string in ShaderInputVars, but a shader
 * cannot read a string — the rendering adapter rasterizes it to a texture on
 * the way to the GPU, so the uniform this input feeds is declared sampler2D.
 * It is the only input kind whose value is a string, which is what lets the
 * adapter recognise one without being told.
 */
export interface TextInputDefinition {
  type: 'text'
  label: string
  placeholder?: string
}

export type ShaderInputDefinition =
  | RangeInputDefinition
  | Vec2InputDefinition
  | ColorInputDefinition
  | ImageInputDefinition
  | BooleanInputDefinition
  | TextInputDefinition

export interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  defaultValues: ShaderInputVars;
  inputs: { [k: string]: ShaderInputDefinition };
  getBody: () => string;
  /**
   * The body as authored, before opacity wrapping — what a published record
   * carries. Optional because hand-built test effects don't always have one;
   * every createShaderRecord product does.
   */
  rawBody?: string;
  /**
   * Name of the parameter that gates this effect's motion, for effects whose
   * body references `time` but that are still when the parameter is zero
   * (e.g. Light Leak's `drift`). Absent means the body tells the whole truth:
   * `time` in the body ⇒ the effect animates.
   */
  animatedBy?: string;
}

export const registeredShaders = [
  'blackAndWhite',
     'colorTint',
     'pixelate',
     'rgbSplit',
     'vignette',
     'wave',
     "kaleidoscope",
     'glitch',
     'neonGlow',
     'gaussianBlur',
     'dream',
     'blend',
     'lightThresholdSwap',
     'hueSwap',
     'colorQuantize',
     "luminanceQuantize",
     'sharpen',
     'filmGrain',
     'outline',
     'textOverlay',
     'vibrance',
     'sepia',
     'duotone',
     'splitTone',
     'bloom',
     'lightLeak',
     'godRays',
     'chromaticAberration',
     'lensDistortion',
     'swirl',
     'tiltShift',
     'halftone',
     'dither',
     'crt',
     'crossHatch',
     'liquify',
     'crystallize',
     'displacement',
     'echo',
     'exposure',
     'temperature',
     'hueRotate'
] as const;

export type ShaderType = typeof registeredShaders[number]

/**
 * The key of any effect the editor can hold: a builtin `ShaderType`, or the
 * AT-URI of a `com.luminframe.effect` record loaded at runtime. The editor and
 * domain speak EffectKey; the closed `ShaderType` union remains the type of
 * the builtin library and its keystone tests.
 */
export type EffectKey = string

/** Every effect resolvable right now: builtins merged with loaded custom effects. */
export type EffectRegistry = Record<EffectKey, ShaderEffect>




