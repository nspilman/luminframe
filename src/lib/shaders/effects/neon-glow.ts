import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const neonGlow = createShaderRecord({
  name: "Neon Glow",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('glowColor').asVec3('Glow Color', 0.0, 1.0, 1.0),
    createShaderVariable('glowStrength').asRange('Glow Strength', 0.1, 0.0, 1.0, 0.002),
    createShaderVariable('glowRadius').asRange('Glow Radius', 0.2, 0.0, 1.0, 0.01)
  ],
  body: `
    float gaussian(float x, float sigma) {
      return exp(-(x * x) / (2.0 * sigma * sigma));
    }
    
    void main() {
      vec2 uv = vUv;
      vec4 originalColor = texture2D(imageTexture, uv);
      vec4 glowAccum = vec4(0.0);
      
      // Apply blur for glow effect
      for(float i = -glowRadius; i <= glowRadius; i++) {
        for(float j = -glowRadius; j <= glowRadius; j++) {
          vec2 offset = vec2(i, j) / resolution;
          float weight = gaussian(length(offset) * glowRadius, 1.0);
          glowAccum += texture2D(imageTexture, uv + offset) * weight;
        }
      }
      
      // Mix original color with glow
      vec3 glow = glowAccum.rgb * glowColor * glowStrength;
      gl_FragColor = vec4(originalColor.rgb + glow, originalColor.a);
    }
  `
}); 