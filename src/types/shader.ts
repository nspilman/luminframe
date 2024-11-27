import { Texture } from 'three'

export type ShaderInputVars = Record<string, string | number | number[] | Texture | null | Float32Array | boolean>

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
     'hueSwap'
] as const;

export type ShaderType = typeof registeredShaders[number]




