import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Displacement warps the source through a *second* image: that map's red and
// green channels push each pixel in x and y, so the source flows over the hidden
// shape. Feed it ripples, a face, a fingerprint. Load the map via "Save as
// Second Image" or the control below.
export const displacement = createShaderRecord({
  name: "Displacement",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Displacement Map'),
    createShaderVariable('amount').asRange('Amount', 0.1, 0.0, 0.5, 0.005),
  ],
  body: `
    void main() {
      vec3 m = texture2D(imageTextureTwo, vUv).rgb;

      // No map loaded (pure black) → identity. Otherwise red/green offset x/y,
      // centered on grey so a mid-tone map means no push.
      vec2 push = (m.rg - 0.5) * step(0.001, dot(m, vec3(1.0)));

      vec2 uv = vUv + push * amount;
      gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
    }
  `
});
