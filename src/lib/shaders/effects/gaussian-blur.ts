import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const gaussianBlur = createShaderRecord({
  name: "Gaussian Blur",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('pixelNumerator').asRange('Pixel Size', 30.0, 1.0, 100.0, 1.0),
    createShaderVariable('offset').asRange('Offset', 0.3, 0.1, 5.0, 0.1),
  ],
  body: `
    vec4 blur9(sampler2D image, vec2 uv) {
        vec2 pixel = pixelNumerator / vec2(1024.0);
        vec4 color = vec4(0.0);
        
        // Center pixel (highest weight)
        color += texture2D(image, uv) * 0.5270270270;
        
        // Sample 8 surrounding pixels with decreasing weights
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
        gl_FragColor = blur9(imageTexture, vUv);
    }
  `
}); 