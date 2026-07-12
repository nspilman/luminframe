import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Lens distortion bends the whole frame through curved glass: positive amounts
// bulge outward (barrel / fisheye / GoPro), negative pinch inward (pincushion).
// Remap each pixel's distance from center by a radial polynomial.
export const lensDistortion = createShaderRecord({
  name: "Lens Distortion",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 0.4, -1.0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 uv = 0.5 + c * (1.0 + amount * r2);

      // Pixels pulled from outside the frame read as black rather than smeared.
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
    }
  `
});
