import { useMemo, useState } from 'react'
import { shaderBuilder } from '@/shaders/shaderBuilder'
import { useWindowSize } from './useWindowSize'
import { createShaderRecord, createShaderVariable } from './shaderRecordBuilder'
import { ShaderEffect, ShaderInputVars, ShaderType } from '@/types/shader';

const testShader = createShaderRecord({
  name: "Color Tint",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('tintColor').asVec3('Tint Color', 1.0, 0.0, 0.0),
    createShaderVariable('tintStrength').asRange('Tint Strength', 0.5, 0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      vec3 tinted = mix(color.rgb, tintColor, tintStrength);
      gl_FragColor = vec4(tinted, color.a);
    }
  `
});

const pixelateEffect = createShaderRecord({
  name: "Pixelate",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('pixelSize').asRange('Pixel Size', 4.0, 1.0, 32.0, 1.0),
    createShaderVariable('resolution').asVec2('Resolution', 1920, 1080)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec2 pixels = resolution/pixelSize;
      vec2 newUV = floor(uv * pixels)/pixels;
      gl_FragColor = texture2D(imageTexture, newUV);
    }
  `
});

const rgbSplitEffect = createShaderRecord({
  name: "RGB Split",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('offset').asRange('Split Amount', 0.005, 0.0, 0.05, 0.001),
    createShaderVariable('angle').asRange('Split Angle', 0.0, 0.0, 6.28, 0.01)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      
      vec2 direction = vec2(cos(angle), sin(angle));
      
      vec4 c1 = texture2D(imageTexture, uv - direction * offset);
      vec4 c2 = texture2D(imageTexture, uv);
      vec4 c3 = texture2D(imageTexture, uv + direction * offset);
      
      gl_FragColor = vec4(c1.r, c2.g, c3.b, c2.a);
    }
  `
});

const vignetteEffect = createShaderRecord({
  name: "Vignette",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 0.5, 0.0, 2.0, 0.1),
    createShaderVariable('smoothness').asRange('Smoothness', 0.5, 0.0, 1.0, 0.1),
    createShaderVariable('color').asVec3('Vignette Color', 0.0, 0.0, 0.0)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 texColor = texture2D(imageTexture, uv);
      
      vec2 center = vec2(0.5);
      float dist = distance(uv, center) * intensity;
      float vig = smoothstep(0.8, 0.2 * smoothness, dist);
      
      vec3 vigColor = mix(color, texColor.rgb, vig);
      gl_FragColor = vec4(vigColor, texColor.a);
    }
  `
});

const waveEffect = createShaderRecord({
  name: "Wave Distortion",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amplitude').asRange('Wave Size', 0.02, 0.0, 0.1, 0.001),
    createShaderVariable('frequency').asRange('Wave Frequency', 10.0, 0.0, 30.0, 0.1),
    createShaderVariable('speed').asRange('Wave Speed', 2.0, 0.0, 10.0, 0.1)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      float wave = amplitude * sin(frequency * uv.y + time * speed);
      vec2 distortedUV = vec2(uv.x + wave, uv.y);
      gl_FragColor = texture2D(imageTexture, distortedUV);
    }
  `
});

const kaleidoscopeEffect = createShaderRecord({
  name: "Kaleidoscope",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('segments').asRange('Segments', 8.0, 2.0, 32.0, 1.0),
    createShaderVariable('rotation').asRange('Rotation', 0.0, 0.0, 6.28, 0.01)
  ],
  body: `
    vec2 rotateUV(vec2 uv, float rotation) {
      float mid = 0.5;
      vec2 center = vec2(mid);
      float s = sin(rotation);
      float c = cos(rotation);
      uv -= center;
      vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
      uv = rotUV + center;
      return uv;
    }

    void main() {
      vec2 uv = vUv - 0.5;
      float angle = atan(uv.y, uv.x);
      float radius = length(uv);
      
      angle = mod(angle + rotation, 6.28319 / segments) - 3.14159 / segments;
      vec2 st = vec2(cos(angle), sin(angle)) * radius + 0.5;
      
      gl_FragColor = texture2D(imageTexture, st);
    }
  `
});

const neonGlowEffect = createShaderRecord({
  name: "Neon Glow",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('glowColor').asVec3('Glow Color', 0.0, 1.0, 1.0),
    createShaderVariable('glowStrength').asRange('Glow Strength', 2.0, 0.0, 5.0, 0.1),
    createShaderVariable('threshold').asRange('Edge Threshold', 0.5, 0.0, 1.0, 0.01)
  ],
  body: `
    float getLuminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec2 uv = vUv;
      vec2 texelSize = 1.0 / vec2(textureSize(imageTexture, 0));
      
      vec4 original = texture2D(imageTexture, uv);
      
      // Edge detection using Sobel
      float sobelX = 0.0;
      float sobelY = 0.0;
      
      for(int i = -1; i <= 1; i++) {
        for(int j = -1; j <= 1; j++) {
          float lum = getLuminance(texture2D(imageTexture, uv + vec2(i, j) * texelSize).rgb);
          sobelX += lum * float(i);
          sobelY += lum * float(j);
        }
      }
      
      float edge = sqrt(sobelX * sobelX + sobelY * sobelY);
      
      // Apply glow
      vec3 glow = glowColor * step(threshold, edge) * glowStrength;
      gl_FragColor = vec4(original.rgb + glow, original.a);
    }
  `
});

const dreamEffect = createShaderRecord({
  name: "Dream Sequence",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('blurAmount').asRange('Blur Strength', 2.0, 0.0, 5.0, 0.1),
    createShaderVariable('brightness').asRange('Brightness', 1.1, 0.0, 2.0, 0.1),
    createShaderVariable('saturation').asRange('Saturation', 1.2, 0.0, 2.0, 0.1)
  ],
  body: `
    vec3 adjustSaturation(vec3 color, float saturation) {
      float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(grey), color, saturation);
    }

    void main() {
      vec2 uv = vUv;
      vec4 color = vec4(0.0);
      float total = 0.0;
      
      // Gaussian blur
      for(float x = -4.0; x <= 4.0; x++) {
        for(float y = -4.0; y <= 4.0; y++) {
          vec2 offset = vec2(x, y) * blurAmount * 0.001;
          float weight = exp(-(x*x + y*y) / 8.0);
          color += texture2D(imageTexture, uv + offset) * weight;
          total += weight;
        }
      }
      color /= total;
      
      // Adjust brightness and saturation
      color.rgb = adjustSaturation(color.rgb * brightness, saturation);
      
      // Add subtle color shift
      float shift = sin(time * 0.5) * 0.02 + 1.0;
      color.rgb *= vec3(shift, 1.0, 2.0-shift);
      
      gl_FragColor = color;
    }
  `
});

const glitchEffect = createShaderRecord({
  name: "Digital Glitch",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Glitch Intensity', 0.1, 0.0, 1.0, 0.01),
    createShaderVariable('speed').asRange('Glitch Speed', 1.0, 0.0, 5.0, 0.1),
    createShaderVariable('blocks').asRange('Block Size', 10.0, 1.0, 50.0, 1.0)
  ],
  body: `
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      float t = floor(time * speed * 60.0);
      
      // Create blocks
      vec2 blockPos = floor(uv * blocks) / blocks;
      float r = random(blockPos + t);
      
      // Apply glitch based on random value
      vec2 glitchOffset = vec2(0.0);
      if (r < intensity) {
        glitchOffset.x = (random(blockPos + t) - 0.5) * 0.1;
        
        // Color channel splitting
        vec4 colorR = texture2D(imageTexture, uv + glitchOffset);
        vec4 colorG = texture2D(imageTexture, uv);
        vec4 colorB = texture2D(imageTexture, uv - glitchOffset);
        
        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
      } else {
        gl_FragColor = texture2D(imageTexture, uv);
      }
    }
  `
});

export const shaderEffects: Record<ShaderType, ShaderEffect> = {
  test: testShader,
  pixelateEffect: pixelateEffect,
  rgbSplit: rgbSplitEffect,
  vignette: vignetteEffect,
  wave: waveEffect,
  kaleidoscopeEffect,
  neonGlowEffect,
  glitch: glitchEffect,
  dream: dreamEffect
};

export function useShader(effectType: ShaderType) {
  const { width, height } = useWindowSize()
  
  const effect = shaderEffects[effectType]
  
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

  console.log({shader})

  const updateVarValue = (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
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
    availableEffects: Object.keys(shaderEffects) as ShaderType[],
    inputs: effect.inputs
  }
} 

