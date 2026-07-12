import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// A light leak is analog film's happy accident: warm light bleeding in from an
// edge where the camera back didn't quite seal. A soft directional gradient,
// wobbling and drifting on time so it breathes, screened over the image.
export const lightLeak = createShaderRecord({
  name: "Light Leak",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('leakColor').asVec3('Leak Color', 1.0, 0.45, 0.2),
    createShaderVariable('angle').asRange('Angle', 0.8, 0.0, 6.28, 0.01),
    createShaderVariable('intensity').asRange('Intensity', 0.8, 0.0, 2.0, 0.05),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // Distance along the leak's direction, drifting on time.
      vec2 dir = vec2(cos(angle), sin(angle));
      float d = dot(vUv - 0.5, dir) + 0.5;
      float leak = smoothstep(0.35, 1.0, d + 0.15 * sin(time * 0.5));

      // Organic wobble so the edge isn't a clean ramp.
      leak *= 0.6 + 0.4 * sin(vUv.y * 6.0 + time);

      // Screen the warm light in.
      vec3 result = 1.0 - (1.0 - c) * (1.0 - leakColor * leak * intensity);
      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
