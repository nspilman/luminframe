import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const lightThresholdSwap = createShaderRecord({
  name: "Light Threshold Swap",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Second Image'),
    createShaderVariable('threshold').asRange('Light Threshold', 382.5, 0.0, 765.0, 1.0),
    createShaderVariable('isHighPass').asBoolean('High Pass Filter'),
  ],
  body: `
    float getLightValue(vec4 color) {
      return (color.r + color.g + color.b) * 255.0;
    }

    void main() {
      vec2 uv = vUv;
      
      vec4 color1 = texture2D(imageTexture, uv);
      vec4 color2 = texture2D(imageTextureTwo, uv);
      
      float lightness = getLightValue(color1);
      
      // High pass: use image2 if lightness > threshold
      // Low pass: use image2 if lightness < threshold
      
      bool shouldUseImageTwo = isHighPass ? lightness < threshold : lightness > threshold;
      
      gl_FragColor = shouldUseImageTwo ? color2 : color1;
    }
  `
}); 