import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Crystallize shatters the image into a Voronoi mosaic: scatter a seed in each
// grid cell, give every pixel the color of its nearest seed, and darken the
// seams where two cells meet — stained glass from a photograph.
export const crystallize = createShaderRecord({
  name: "Crystallize",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('cellSize').asRange('Cell Size', 20.0, 6.0, 80.0, 1.0),
    createShaderVariable('border').asRange('Border', 0.06, 0.0, 0.3, 0.01),
  ],
  body: `
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 grid = vUv * resolution / max(cellSize, 1.0);
      vec2 base = floor(grid);

      // Nearest and second-nearest jittered seeds across the 3x3 neighborhood.
      float d1 = 1e9, d2 = 1e9;
      vec2 nearest = base;
      for (float y = -1.0; y <= 1.0; y += 1.0) {
        for (float x = -1.0; x <= 1.0; x += 1.0) {
          vec2 cell = base + vec2(x, y);
          vec2 seed = cell + vec2(hash(cell), hash(cell + 7.3));
          float d = length(grid - seed);
          if (d < d1) { d2 = d1; d1 = d; nearest = seed; }
          else if (d < d2) { d2 = d; }
        }
      }

      // The whole cell takes the color at its seed.
      vec3 col = texture2D(imageTexture, nearest * cellSize / resolution).rgb;

      // Darken the seam where the two nearest seeds are equidistant.
      col *= smoothstep(0.0, border, d2 - d1);

      gl_FragColor = vec4(col, 1.0);
    }
  `
});
