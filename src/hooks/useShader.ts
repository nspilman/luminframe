import { useMemo, useState } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { Texture } from 'three';
import { ShaderInputVars } from '@/types/shader'

export function useShader(image: Texture | null) {
  const [varValues, setVarValues] = useState<ShaderInputVars>({
    resolution: [window.innerWidth, window.innerHeight],
    pixelSize: 10.2,
    offset: 10.0
  })

  const declarationVars = {
    imageTexture: "sampler2D",
    resolution: "vec2",
    pixelSize: "float",
    offset: "float"
  }

  const shader = useMemo(() => shaderBuilder({
    vars: declarationVars, 
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
  }), [varValues, declarationVars])

  const updateVarValue = (key: keyof Omit<ShaderInputVars, 'imageTexture' | 'resolution'>, value: number) => {
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return { shader, varValues: {...varValues, imageTexture: image}, updateVarValue }
} 