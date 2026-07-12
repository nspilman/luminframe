import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Halftone is how ink pretends to have grey: a grid of dots on a rotated screen,
// each dot growing as the image beneath it darkens. Comic books and newsprint.
export const halftone = createShaderRecord({
  name: "Halftone",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('dotSize').asRange('Dot Size', 6.0, 2.0, 20.0, 0.5),
    createShaderVariable('angle').asRange('Screen Angle', 0.4, 0.0, 1.57, 0.01),
    createShaderVariable('inkColor').asVec3('Ink', 0.0, 0.0, 0.0),
  ],
  body: `
    void main() {
      float lum = dot(texture2D(imageTexture, vUv).rgb, vec3(0.299, 0.587, 0.114));

      // A rotated grid of cells, in device pixels.
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 grid = rot * (vUv * resolution) / max(dotSize, 1.0);
      vec2 cell = fract(grid) - 0.5;

      // Dot radius grows as the image darkens; ink where we're inside it.
      float radius = (1.0 - lum) * 0.75;
      float ink = smoothstep(radius + 0.05, radius - 0.05, length(cell));

      gl_FragColor = vec4(mix(vec3(1.0), inkColor, ink), 1.0);
    }
  `
});
