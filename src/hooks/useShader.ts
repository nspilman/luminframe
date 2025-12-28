import { useEffect, useMemo, useState } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { ShaderInputVars, ShaderType } from '@/types/shader'
import { shaderLibrary } from '@/lib/shaders'
import { useWindowSize } from './useWindowSize'
import { Image } from '@/domain/models/Image'

export function useShader(effectType: ShaderType) {
  const windowSize = useWindowSize()

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

  const updateVarValue = (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Calculate resolution from image dimensions or fallback to window size
  const imageOne = varValues["imageTexture"]
  const resolution: [number, number] = imageOne instanceof Image
    ? imageOne.getDimensions().toArray()
    : windowSize.toArray()

  return {
    shader,
    varValues: {
      ...varValues,
      resolution
    },
    updateVarValue,
    effect,
    availableEffects: Object.keys(shaderLibrary) as ShaderType[],
  }
} 

