import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const blackAndWhite = createShaderRecord({
  name: "Black & White",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('contrast').asRange('Contrast', 1.0, 0.0, 2.0, 0.01),
    createShaderVariable('blackPoint').asRange('Black Point', 0.0, 0.0, 1.0, 0.01),
  ],
  body: `
    float getLuminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      
      // Convert to grayscale using luminance
      float gray = getLuminance(color.rgb);
      
      // Apply black point adjustment
      gray = smoothstep(blackPoint, 1.0, gray);
      
      // Apply contrast adjustment
      gray = (gray - 0.5) * contrast + 0.5;
      
      // Clamp values
      gray = clamp(gray, 0.0, 1.0);
      
      gl_FragColor = vec4(vec3(gray), color.a);
    }
  `
}); 