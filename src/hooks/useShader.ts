import { useEffect, useMemo, useState } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { ShaderInputVars, ShaderType } from '@/types/shader'
import { shaderLibrary } from '@/lib/shaders'
import { useWindowSize } from './useWindowSize'

export function useShader(effectType: ShaderType) {
  const { width, height } = useWindowSize()
  
  const effect = shaderLibrary[effectType]
  
  if (!effect) {
    throw new Error(`Invalid shader effect type: ${effectType}`)
  }
  
  const [varValues, setVarValues] = useState<ShaderInputVars>({
    ...effect.defaultValues,
  })

  useEffect(() => {
    setVarValues(prev => {
      const newDefaults = { ...effect.defaultValues }
      // Only add default values for keys that don't exist in prev
      return {
        ...newDefaults,
        ...prev,
        // Filter to only keep values for keys that exist in newDefaults
        ...Object.fromEntries(
          Object.entries(prev).filter(([key]) => key in newDefaults)
        )
      }
    })
  }, [effectType])

  const shader = useMemo(() => shaderBuilder({
    vars: effect.declarationVars,
    getBody: effect.getBody,
  }), [effect, varValues])

  console.log({varValues})

  const updateVarValue = (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const imageOne = varValues["imageTexture"];

  return { 
    shader, 
    //@ts-ignore
    varValues: { imageTexture: null, ...varValues, resolution: [imageOne?.userData?.width || width, imageOne?.userData?.height || height] as [number, number] }, 
    updateVarValue,
    effect,
    availableEffects: Object.keys(shaderLibrary) as ShaderType[],
  }
} 

