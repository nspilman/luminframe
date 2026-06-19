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

export type ShaderInputDefinition =
  | RangeInputDefinition
  | Vec2InputDefinition
  | ColorInputDefinition
  | ImageInputDefinition
  | BooleanInputDefinition

export interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  defaultValues: { [k: string]: any };
  inputs: { [k: string]: ShaderInputDefinition };
  getBody: () => string;
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
     "luminanceQuantize"
] as const;

export type ShaderType = typeof registeredShaders[number]




