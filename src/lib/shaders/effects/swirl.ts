import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Swirl twists the image around its center — hardest near the middle, fading to
// nothing at the edge of the radius. A vortex you can dial from a gentle curl to
// a full whirlpool, either direction.
export const swirl = createShaderRecord({
  name: "Swirl",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 3.0, -8.0, 8.0, 0.1),
    createShaderVariable('radius').asRange('Radius', 0.5, 0.1, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec2 c = vUv - 0.5;
      float dist = length(c);

      // Twist strongest at the center, easing to zero at the radius.
      float angle = amount * smoothstep(radius, 0.0, dist);
      float s = sin(angle);
      float co = cos(angle);
      vec2 uv = 0.5 + vec2(c.x * co - c.y * s, c.x * s + c.y * co);

      gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
    }
  `
});
