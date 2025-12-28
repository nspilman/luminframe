import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const vignette = createShaderRecord({
  name: "Vignette",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 0.5, 0.0, 1.0, 0.01),
    createShaderVariable('smoothness').asRange('Smoothness', 0.5, 0.0, 1.0, 0.01)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      
      // Calculate distance from center
      vec2 center = vec2(0.5);
      float dist = distance(uv, center);
      
      // Create vignette effect
      float vignette = smoothstep(0.8, 0.2 * smoothness, dist * (1.0 + intensity));
      
      gl_FragColor = vec4(color.rgb * vignette, color.a);
    }
  `
}); 