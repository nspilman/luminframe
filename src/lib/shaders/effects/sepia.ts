import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Sepia — the one effect every human expects and the app didn't have. The
// canonical warm-brown matrix, dialed in by a single intensity knob so it goes
// from a hint of age to a full antique print.
export const sepia = createShaderRecord({
  name: "Sepia",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 1.0, 0.0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // The classic sepia colour matrix.
      vec3 sepia = vec3(
        dot(c, vec3(0.393, 0.769, 0.189)),
        dot(c, vec3(0.349, 0.686, 0.168)),
        dot(c, vec3(0.272, 0.534, 0.131))
      );

      gl_FragColor = vec4(mix(c, clamp(sepia, 0.0, 1.0), intensity), 1.0);
    }
  `
});
