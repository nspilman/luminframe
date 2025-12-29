import { Image } from '@/domain/models/Image'
import { Color } from '@/domain/value-objects/Color'

/**
 * Shader input variables containing parameter values.
 * All values are domain types - no infrastructure dependencies.
 *
 * Note: Image domain objects will be converted to textures by the rendering adapter.
 */
export type ShaderInputVars = Record<string, string | number | number[] | Image | Color | null | Float32Array | boolean>

export type ShaderInputDefinition = {
    type: 'range' | 'number' | 'vec2' | 'vec3' | 'image' | 'boolean'
    min?: number
    max?: number
    step?: number
    label: string
    isOn?:boolean
  }

export interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  defaultValues: { [k: string]: any };
  inputs: { [k: string]: ShaderInputDefinition };
  getBody: () => string;
}

export const registeredShaders = [
  'blackAndWhite',
     'tint',
     'pixelateEffect',
     'rgbSplit',
     'vignette',
     'wave',
     "kaleidoscopeEffect",
     'glitch',
     'neonGlowEffect',
     'gaussianBlur',
     'dream',
     'blend',
     'lightThresholdSwap',
     'hueSwap',
     'colorQuantize',
     "luminanceQuantize"
] as const;

export type ShaderType = typeof registeredShaders[number]




