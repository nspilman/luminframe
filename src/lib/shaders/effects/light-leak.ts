import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// A light leak is analog film's happy accident: warm light bleeding in from an
// edge where the camera back didn't quite seal. On real film it's a static
// burn, so it's still by default — a soft directional gradient with an organic
// edge. Turn `drift` up and it breathes: the leak wanders and wobbles on time,
// and the edit becomes an animated one (drift gates the whole render loop via
// `animatedBy`, so at zero it exports as the still it visibly is).
export const lightLeak = createShaderRecord({
  name: "Light Leak",
  animatedBy: 'drift',
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('leakColor').asVec3('Leak Color', 1.0, 0.45, 0.2),
    createShaderVariable('angle').asRange('Angle', 0.8, 0.0, 6.28, 0.01),
    createShaderVariable('intensity').asRange('Intensity', 0.8, 0.0, 2.0, 0.05),
    createShaderVariable('drift').asRange('Drift', 0.0, 0.0, 2.0, 0.05),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // Distance along the leak's direction; drift sets how fast it wanders
      // (at zero the leak holds still, like a burn on the negative).
      vec2 dir = vec2(cos(angle), sin(angle));
      float d = dot(vUv - 0.5, dir) + 0.5;
      float leak = smoothstep(0.35, 1.0, d + 0.15 * sin(time * 0.5 * drift));

      // Organic wobble so the edge isn't a clean ramp; drifts at the same rate.
      leak *= 0.6 + 0.4 * sin(vUv.y * 6.0 + time * drift);

      // Screen the warm light in.
      vec3 result = 1.0 - (1.0 - c) * (1.0 - leakColor * leak * intensity);
      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
