import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const pixelate = createShaderRecord({
  name: "Pixelate",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('pixelSize').asRange('Pixel Size', 4.0, 1.0, 32.0, 1.0),
    // `resolution` is not declared here even though the body reads it: the
    // chain owns it and binds the source image's own pixel size, which is what
    // makes the block size the user sees match the block size they export.
    // Declaring it would put a slider on screen that the chain overrules.
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