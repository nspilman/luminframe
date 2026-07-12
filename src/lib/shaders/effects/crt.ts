import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// CRT reassembles the old cathode-ray monitor: the glass curves, horizontal
// scanlines darken every other row, and an aperture mask tints the columns
// red/green/blue the way phosphor stripes do up close.
export const crt = createShaderRecord({
  name: "CRT",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('scanIntensity').asRange('Scanlines', 0.4, 0.0, 1.0, 0.01),
    createShaderVariable('curvature').asRange('Curvature', 0.15, 0.0, 0.6, 0.01),
    createShaderVariable('scanSize').asRange('Scan Size', 2.0, 1.0, 6.0, 0.5),
  ],
  body: `
    void main() {
      // Bulge the glass; pixels off the tube read black.
      vec2 c = vUv - 0.5;
      vec2 uv = 0.5 + c * (1.0 + curvature * dot(c, c) * 2.0);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      vec3 col = texture2D(imageTexture, uv).rgb;

      // Scanlines darken alternating rows.
      float line = sin(uv.y * resolution.y * 3.14159 / max(scanSize, 1.0));
      col *= 1.0 - scanIntensity * (0.5 - 0.5 * line);

      // Aperture mask — nudge each column toward one phosphor color.
      float stripe = mod(floor(uv.x * resolution.x), 3.0);
      vec3 mask = vec3(
        stripe == 0.0 ? 1.1 : 0.95,
        stripe == 1.0 ? 1.1 : 0.95,
        stripe == 2.0 ? 1.1 : 0.95
      );
      col *= mask;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
});
