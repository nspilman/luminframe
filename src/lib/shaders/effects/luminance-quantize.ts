import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const luminanceQuantize = createShaderRecord({
  name: "Luminance Quantize",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('stepSize').asRange('Step Size', 0.1, 0.01, 0.5, 0.01),
  ],
  body: `
    // Helper function for HSL to RGB conversion
    float hue2rgb(float p, float q, float t) {
      if (t < 0.0) t += 1.0;
      if (t > 1.0) t -= 1.0;
      if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
      if (t < 1.0/2.0) return q;
      if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
      return p;
    }

    // Convert RGB to HSL
    vec3 rgb2hsl(vec3 color) {
      float maxColor = max(max(color.r, color.g), color.b);
      float minColor = min(min(color.r, color.g), color.b);
      float delta = maxColor - minColor;
      
      vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);
      
      if (delta != 0.0) {
        hsl.y = hsl.z < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);
        
        if (maxColor == color.r) {
          hsl.x = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
        } else if (maxColor == color.g) {
          hsl.x = (color.b - color.r) / delta + 2.0;
        } else {
          hsl.x = (color.r - color.g) / delta + 4.0;
        }
        hsl.x /= 6.0;
      }
      
      return hsl;
    }

    // Convert HSL to RGB
    vec3 hsl2rgb(vec3 hsl) {
      if (hsl.y == 0.0) {
        return vec3(hsl.z);
      }
      
      float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
      float p = 2.0 * hsl.z - q;
      
      vec3 rgb = vec3(
        hue2rgb(p, q, hsl.x + 1.0/3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0/3.0)
      );
      
      return rgb;
    }

    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      
      // Convert to HSL
      vec3 hsl = rgb2hsl(color.rgb);
      
      // Quantize luminance while preserving hue and saturation
      float quantizedL = floor(hsl.z / stepSize) * stepSize;
      
      // Convert back to RGB
      vec3 quantizedRGB = hsl2rgb(vec3(hsl.xy, quantizedL));
      
      gl_FragColor = vec4(quantizedRGB, color.a);
    }
  `
}); 