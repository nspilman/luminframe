import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Echo is the first feedback effect: it blends the current frame with the
// *previous* one, sampled from a slightly zoomed and rotated position, so the
// accumulated image recurses inward into an endless droste tunnel/spiral. It
// self-animates — the loop re-renders and the trail deepens each frame.
export const echo = createShaderRecord({
  name: "Echo",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('feedback').asRange('Feedback', 0.85, 0.0, 0.98, 0.01),
    createShaderVariable('zoom').asRange('Zoom', 0.98, 0.9, 1.05, 0.005),
    createShaderVariable('rotate').asRange('Rotate', 0.0, -0.15, 0.15, 0.005),
  ],
  body: `
    void main() {
      vec3 cur = texture2D(imageTexture, vUv).rgb;

      // Read last frame from a zoomed + rotated position → the feedback recurses.
      vec2 c = vUv - 0.5;
      float s = sin(rotate);
      float co = cos(rotate);
      vec2 warped = vec2(c.x * co - c.y * s, c.x * s + c.y * co) * zoom + 0.5;
      vec3 prev = texture2D(prevFrame, warped).rgb;

      gl_FragColor = vec4(mix(cur, prev, feedback), 1.0);
    }
  `
});
