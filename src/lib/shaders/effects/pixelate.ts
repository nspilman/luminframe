import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const pixelate = createShaderRecord({
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