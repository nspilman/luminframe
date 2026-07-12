import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Vibrance is the saturation the app had the math for and never shipped. It's
// the *smart* one: it boosts already-muted colors hard and leaves vivid ones
// mostly alone, so nothing blows out. Negative amounts drain toward grey.
export const vibrance = createShaderRecord({
  name: "Vibrance",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 0.6, -1.0, 2.0, 0.05),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));

      // How saturated this pixel already is (0 = grey, 1 = pure hue).
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));

      // Muted pixels get the most push; vivid ones are protected.
      float factor = 1.0 + amount * (1.0 - sat);
      vec3 result = mix(vec3(lum), c, factor);

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
