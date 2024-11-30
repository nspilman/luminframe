import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const colorQuantize = createShaderRecord({
  name: "Color Quantize",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('colorLevels').asRange('Number of Colors', 8.0, 2.0, 32.0, 1.0),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      
      // Calculate step size based on number of colors
      float steps = colorLevels - 1.0;
      float stepSize = 1.0 / steps;
      
      // Quantize each RGB channel
      vec3 quantized = floor(color.rgb * steps + 0.5) / steps;
      
      gl_FragColor = vec4(quantized, color.a);
    }
  `
}); 