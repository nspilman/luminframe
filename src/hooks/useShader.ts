import { useMemo, useState, useEffect } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { Texture } from 'three'
import { ShaderInputVars, ShaderEffect, ShaderType } from '@/types/shader'
import { useWindowSize } from './useWindowSize'

export const shaderEffects: Record<ShaderType, ShaderEffect> = {
  blur: {
    name: 'Gaussian Blur',
    declarationVars: {
      imageTexture: "sampler2D",
      resolution: "vec2",
      pixelSize: "float",
      offset: "float"
    },
    defaultValues: {
      pixelSize: 3.2,
      offset: 5.0
    },
    getBody: () => `
      vec4 blur9(sampler2D image, vec2 uv, vec2 resolution) {
        vec2 pixel = pixelSize / resolution;
        
        vec4 color = vec4(0.0);
        
        color += texture2D(image, uv) * 0.2270270270;
        
        color += texture2D(image, uv + vec2(-offset, -offset) * pixel) * 0.0945945946;
        color += texture2D(image, uv + vec2(0.0, -offset) * pixel) * 0.1216216216;
        color += texture2D(image, uv + vec2(offset, -offset) * pixel) * 0.0945945946;
        color += texture2D(image, uv + vec2(-offset, 0.0) * pixel) * 0.1216216216;
        color += texture2D(image, uv + vec2(offset, 0.0) * pixel) * 0.1216216216;
        color += texture2D(image, uv + vec2(-offset, offset) * pixel) * 0.0945945946;
        color += texture2D(image, uv + vec2(0.0, offset) * pixel) * 0.1216216216;
        color += texture2D(image, uv + vec2(offset, offset) * pixel) * 0.0945945946;
        
        return color;
      }

      void main() {
          vec2 uv = vUv;
          gl_FragColor = blur9(imageTexture, uv, resolution);
      }
    `
  },
  whiteout: {
    name: 'White Out',
    declarationVars: {
      imageTexture: "sampler2D",
      threshold: "float"
    },
    defaultValues: {
      threshold: 0.75
    },
    getBody: () => `
      void main() {
          vec2 uv = vUv;
          vec4 color = texture2D(imageTexture, uv);
          float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          if(luminance > threshold) {
              color = vec4(1.0);
          }
          
          gl_FragColor = color;
      }
    `
  },
  wave: {
    name: 'Wave Effect',
    declarationVars: {
      imageTexture: "sampler2D",
      time: "float",
      amplitude: "float",
      frequency: "float"
    },
    defaultValues: {
      amplitude: 0.1,
      frequency: 5.0
    },
    getBody: () => `
      void main() {
          vec2 uv = vUv;
          uv.y += sin(uv.x * frequency + time) * amplitude;
          gl_FragColor = texture2D(imageTexture, uv);
      }
    `
  }
}

export function useShader(texture: Texture | null, effectType: 'blur' | 'whiteout' | 'wave') {
  const { width, height } = useWindowSize()
  
  const effect = shaderEffects[effectType]
  
  const [varValues, setVarValues] = useState<ShaderInputVars>({
    ...effect.defaultValues,
    imageTexture: texture
  })

  useEffect(() => {
    setVarValues({
      ...effect.defaultValues,
      imageTexture: texture
    })
  }, [effect, texture])

  const shader = useMemo(() => shaderBuilder({
    vars: effect.declarationVars,
    getBody: effect.getBody
  }), [effect])

  const updateVarValue = (key: keyof ShaderInputVars, value: number) => {
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return { 
    shader, 
    varValues: { ...varValues, imageTexture: texture, resolution: [width, height] }, 
    updateVarValue,
    effectName: effect.name,
    availableEffects: Object.keys(shaderEffects) as ShaderType[]
  }
} 