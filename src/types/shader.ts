import { Texture } from 'three'

export type ShaderInputVars = Record<string, string | number | number[] | Texture | null>

export type ShaderInputDefinition = {
    type: 'range' | 'number' | 'vec2' | 'vec3' | 'image'
    min?: number
    max?: number
    step?: number
    label: string
  }

export interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  defaultValues: { [k: string]: any };
  inputs: { [k: string]: ShaderInputDefinition };
  getBody: () => string;
}

export const registeredShaders = [
     'test',
     'pixelateEffect',
     'rgbSplit',
     'vignette',
     'wave',
     "kaleidoscopeEffect",
     'glitch',
     'neonGlowEffect',
     'dream',
] as const;

export type ShaderType = typeof registeredShaders[number]




