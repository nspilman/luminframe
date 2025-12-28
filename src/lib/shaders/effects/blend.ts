import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const blend = createShaderRecord({
  name: "Blend",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Second Image'),
    createShaderVariable('blendStrength').asRange('Blend Strength', 0.5, 0.0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      
      // Sample both textures
      vec4 tex1 = texture2D(imageTexture, uv);
      vec4 tex2 = texture2D(imageTextureTwo, uv);
      
      // Linear interpolation between the two textures
      vec4 finalColor = mix(tex1, tex2, blendStrength);
      
      gl_FragColor = finalColor;
    }
  `
}); 