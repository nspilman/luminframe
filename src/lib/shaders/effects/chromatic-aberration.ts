import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Real chromatic aberration, not RGB Split's uniform shove: a lens fails to
// focus every wavelength at the same point, and the failure grows toward the
// edges and vanishes at center. Offset the channels radially by distance.
export const chromaticAberration = createShaderRecord({
  name: "Chromatic Aberration",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 0.15, 0.0, 0.6, 0.005),
  ],
  body: `
    void main() {
      // Direction and distance from center drive the split.
      vec2 dir = vUv - 0.5;
      vec2 offset = dir * dot(dir, dir) * amount * 4.0;

      float r = texture2D(imageTexture, vUv - offset).r;
      float g = texture2D(imageTexture, vUv).g;
      float b = texture2D(imageTexture, vUv + offset).b;

      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
});
