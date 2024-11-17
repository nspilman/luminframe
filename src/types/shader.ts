import { Texture } from 'three'

export type ShaderInputVars = Record<string, string | number | number[] | Texture | null>

export type ShaderEffect = {
  name: string
  declarationVars: Record<string, string>
  defaultValues: ShaderInputVars
  getBody: () => string
}

export const registeredShaders = [
    'blur', 'whiteout', 'wave'
] as const;

export type ShaderType = typeof registeredShaders[number]