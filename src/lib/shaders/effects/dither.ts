import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Ordered dither trades grey for a fixed screen-space pattern: each pixel is
// pushed fully to one of two tones depending on a deterministic threshold at its
// position. The 1-bit GameBoy / early-Macintosh / risograph look.
export const dither = createShaderRecord({
  name: "Dither",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('pixelSize').asRange('Pixel Size', 3.0, 1.0, 12.0, 0.5),
    createShaderVariable('darkColor').asVec3('Dark', 0.0, 0.0, 0.0),
    createShaderVariable('lightColor').asVec3('Light', 1.0, 1.0, 1.0),
  ],
  body: `
    // Interleaved gradient noise — a deterministic, ordered screen-space
    // threshold (same position always yields the same value).
    float orderedThreshold(vec2 p) {
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }

    void main() {
      // Snap to a coarser pixel grid so the pattern is chunky and visible.
      vec2 cell = floor(vUv * resolution / max(pixelSize, 1.0));
      vec3 c = texture2D(imageTexture, (cell * pixelSize + pixelSize * 0.5) / resolution).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));

      float bw = step(orderedThreshold(cell), lum);
      gl_FragColor = vec4(mix(darkColor, lightColor, bw), 1.0);
    }
  `
});
