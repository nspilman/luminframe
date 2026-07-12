import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Cross-hatch draws tone the way an engraver does: layers of parallel strokes,
// each layer switching on as the image gets darker, until the shadows are a
// dense weave. A photograph becomes a pen-and-ink sketch.
export const crossHatch = createShaderRecord({
  name: "Cross Hatch",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('spacing').asRange('Spacing', 6.0, 3.0, 16.0, 0.5),
    createShaderVariable('inkColor').asVec3('Ink', 0.05, 0.05, 0.05),
  ],
  body: `
    // 0 on a stroke, 1 off it — parallel lines at the given angle and spacing.
    float strokes(vec2 p, float angleDeg, float spacing) {
      float a = radians(angleDeg);
      float v = p.x * cos(a) + p.y * sin(a);
      return step(2.0, mod(v, spacing));
    }

    void main() {
      float lum = dot(texture2D(imageTexture, vUv).rgb, vec3(0.299, 0.587, 0.114));
      vec2 p = vUv * resolution;

      // Each darker band adds another direction of hatching.
      float hatch = 1.0;
      if (lum < 0.85) hatch = min(hatch, strokes(p,  45.0, spacing));
      if (lum < 0.65) hatch = min(hatch, strokes(p, -45.0, spacing));
      if (lum < 0.45) hatch = min(hatch, strokes(p,   0.0, spacing));
      if (lum < 0.25) hatch = min(hatch, strokes(p,  90.0, spacing));

      gl_FragColor = vec4(mix(inkColor, vec3(1.0), hatch), 1.0);
    }
  `
});
