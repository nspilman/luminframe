import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const dream = createShaderRecord({
  name: "Dream",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('blurAmount').asRange('Blur Amount', 2.0, 0.0, 5.0, 0.1),
    createShaderVariable('brightness').asRange('Brightness', 1.2, 0.5, 2.0, 0.1),
    createShaderVariable('saturation').asRange('Saturation', 1.3, 0.0, 2.0, 0.1)
  ],
  body: `
    vec3 adjustSaturation(vec3 color, float saturation) {
      float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(grey), color, saturation);
    }
    
    void main() {
      vec2 uv = vUv;
      vec4 color = vec4(0.0);
      
      // Apply gaussian blur
      float total = 0.0;
      for(float i = -blurAmount; i <= blurAmount; i++) {
        for(float j = -blurAmount; j <= blurAmount; j++) {
          vec2 offset = vec2(i, j) / resolution;
          float weight = exp(-(i*i + j*j) / (2.0 * blurAmount * blurAmount));
          color += texture2D(imageTexture, uv + offset) * weight;
          total += weight;
        }
      }
      
      // Normalize the color
      color /= total;
      
      // Adjust brightness and saturation
      color.rgb = adjustSaturation(color.rgb, saturation);
      color.rgb *= brightness;
      
      gl_FragColor = color;
    }
  `
}); 