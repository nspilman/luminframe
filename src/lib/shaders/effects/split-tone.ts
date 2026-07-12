import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Split Tone is the whole grammar of modern cinema in one effect: push the
// shadows one way and the highlights another. Teal-and-orange out of the box.
// Unlike Duotone it tints rather than replaces, so the image survives underneath.
export const splitTone = createShaderRecord({
  name: "Split Tone",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('shadowColor').asVec3('Shadow Tint', 0.30, 0.55, 0.65),
    createShaderVariable('highlightColor').asVec3('Highlight Tint', 1.0, 0.78, 0.45),
    createShaderVariable('strength').asRange('Strength', 0.5, 0.0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));

      // Two soft masks: one weighted to the darks, one to the lights.
      float highW = smoothstep(0.2, 0.8, lum);
      float shadowW = 1.0 - highW;

      // Multiply the tint into each region, tempered by strength.
      vec3 result = c;
      result = mix(result, result * (shadowColor * 2.0), shadowW * strength);
      result = mix(result, result * (highlightColor * 2.0), highW * strength);

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
