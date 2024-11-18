import { useMemo, useState } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { useWindowSize } from './useWindowSize'
import { ShaderInputVars, ShaderType } from '@/types/shader'
import { shaderLibrary } from '@/lib/shaders'

export function useShader(effectType: ShaderType) {
  const { width, height } = useWindowSize()
  
  const effect = shaderLibrary[effectType]
  
  if (!effect) {
    throw new Error(`Invalid shader effect type: ${effectType}`)
  }
  
  const [varValues, setVarValues] = useState<ShaderInputVars>({
    ...effect.defaultValues,
  })

  const shader = useMemo(() => shaderBuilder({
    vars: effect.declarationVars,
    getBody: effect.getBody,
  }), [effect, varValues])

  const updateVarValue = (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
    console.log({key, value })
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return { 
    shader, 
    varValues: { ...varValues, resolution: [width, height] as [number, number] }, 
    updateVarValue,
    effectName: effect.name,
    availableEffects: Object.keys(shaderLibrary) as ShaderType[],
    inputs: effect.inputs
  }
} 

