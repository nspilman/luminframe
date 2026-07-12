import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// God rays — crepuscular light. March from each pixel back toward a light
// position, accumulating the bright samples along the way with a decay, so the
// highlights streak outward into volumetric shafts.
export const godRays = createShaderRecord({
  name: "God Rays",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('lightX').asRange('Light X', 0.5, 0.0, 1.0, 0.01),
    createShaderVariable('lightY').asRange('Light Y', 0.2, 0.0, 1.0, 0.01),
    createShaderVariable('intensity').asRange('Intensity', 0.8, 0.0, 3.0, 0.05),
    createShaderVariable('threshold').asRange('Threshold', 0.6, 0.0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // Step from this pixel toward the light, accumulating bright samples.
      vec2 toLight = vec2(lightX, lightY) - vUv;
      vec2 stepv = toLight / 32.0 * 0.6;
      vec2 uv = vUv;
      float decay = 1.0;
      vec3 rays = vec3(0.0);
      for (int i = 0; i < 32; i++) {
        uv += stepv;
        vec3 s = texture2D(imageTexture, uv).rgb;
        float bright = max(0.0, dot(s, vec3(0.299, 0.587, 0.114)) - threshold);
        rays += s * bright * decay;
        decay *= 0.94;
      }
      rays /= 12.0;

      gl_FragColor = vec4(clamp(c + rays * intensity, 0.0, 1.0), 1.0);
    }
  `
});
