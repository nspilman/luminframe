import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const rgbSplit = createShaderRecord({
  name: "RGB Split",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('offset').asRange('Split Amount', 0.005, 0.0, 0.05, 0.001),
    createShaderVariable('angle').asRange('Split Angle', 0.0, 0.0, Math.PI * 2, 0.01)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      
      // Calculate directional offset
      vec2 direction = vec2(cos(angle), sin(angle));
      
      // Sample each color channel with offset
      float r = texture2D(imageTexture, uv + direction * offset).r;
      float g = texture2D(imageTexture, uv).g;
      float b = texture2D(imageTexture, uv - direction * offset).b;
      
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
}); 