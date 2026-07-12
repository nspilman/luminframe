import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Film grain is the analog breath a digital image lacks. Not flat noise — it is
// shaped like silver halide: the shadows carry more grain than the highlights,
// and it drifts every frame so it reads as film moving, not fixed dither.
export const filmGrain = createShaderRecord({
  name: "Film Grain",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 0.12, 0.0, 0.5, 0.01),
    createShaderVariable('grainSize').asRange('Grain Size', 1.5, 0.5, 6.0, 0.1),
    createShaderVariable('colored').asBoolean('Colored', false),
  ],
  body: `
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // Sample noise on a grid coarser than pixels (grain has a size), drifting
      // each frame so it lives.
      vec2 cell = floor(vUv * resolution / max(grainSize, 0.5));
      vec2 seed = cell + fract(time) * 137.0;

      // Shadows breathe more than highlights — the silver-halide response curve.
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      float weight = amount * mix(1.0, 0.35, lum);

      vec3 noise = colored
        ? vec3(random(seed), random(seed + 17.0), random(seed + 43.0)) - 0.5
        : vec3(random(seed) - 0.5);

      gl_FragColor = vec4(clamp(c + noise * weight, 0.0, 1.0), 1.0);
    }
  `
});
