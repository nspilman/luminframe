import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Duotone maps the whole image onto a two-colour gradient by brightness:
// shadows become one colour, highlights another, everything between is the ramp.
// The Warhol / risograph / Spotify-poster look — the two colours are the soul.
export const duotone = createShaderRecord({
  name: "Duotone",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('shadowColor').asVec3('Shadow Color', 0.10, 0.06, 0.30),
    createShaderVariable('highlightColor').asVec3('Highlight Color', 1.0, 0.86, 0.52),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));

      // Brightness picks the point along the shadow → highlight ramp.
      vec3 duo = mix(shadowColor, highlightColor, lum);

      gl_FragColor = vec4(duo, 1.0);
    }
  `
});
