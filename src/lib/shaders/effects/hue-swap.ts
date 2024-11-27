import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const hueSwap = createShaderRecord({
    name: "Hue Swap",
    variables: [
      createShaderVariable('imageTexture').asImage('Source Image'),
      createShaderVariable('imageTextureTwo').asImage('Hue Source Image'),
    ],
    body: `
      float getLuminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }
  
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
  
      void main() {
        vec4 color1 = texture2D(imageTexture, vUv);
        vec4 color2 = texture2D(imageTextureTwo, vUv);
        
        // Convert both colors to HSV
        vec3 hsv1 = rgb2hsv(color1.rgb);
        vec3 hsv2 = rgb2hsv(color2.rgb);
        
        // Only take the hue (x component) from color2, keep saturation and value from color1
        vec3 newColor = hsv2rgb(vec3(hsv2.x, hsv1.y, hsv1.z));
        
        gl_FragColor = vec4(newColor, color1.a);
      }
    `
  });