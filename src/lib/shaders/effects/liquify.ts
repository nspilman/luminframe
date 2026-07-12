import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Liquify melts the image by pushing each pixel along a field of flowing value
// noise that drifts on time — the whole frame becomes a slow, liquid current.
export const liquify = createShaderRecord({
  name: "Liquify",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 0.05, 0.0, 0.25, 0.005),
    createShaderVariable('scale').asRange('Scale', 5.0, 1.0, 20.0, 0.5),
    createShaderVariable('speed').asRange('Speed', 0.5, 0.0, 3.0, 0.05),
  ],
  body: `
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      float t = time * speed;
      // Two noise fields drive the x and y push, offset so they don't correlate.
      vec2 flow = vec2(
        valueNoise(vUv * scale + vec2(0.0, t)),
        valueNoise(vUv * scale + vec2(5.2, t + 1.3))
      ) - 0.5;

      vec2 uv = vUv + flow * amount;
      gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
    }
  `
});
