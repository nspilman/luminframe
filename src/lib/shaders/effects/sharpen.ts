import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Sharpen is the counterweight to the whole Focus family: where blur pulls a
// pixel toward its neighbors, sharpen pushes it away from them. It is an unsharp
// mask — the image minus a blurred copy of itself, added back with gain.
export const sharpen = createShaderRecord({
  name: "Sharpen",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 1.2, 0.0, 4.0, 0.05),
    createShaderVariable('radius').asRange('Radius', 1.0, 0.5, 4.0, 0.1),
  ],
  body: `
    void main() {
      vec2 texel = radius / resolution;
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // 3x3 gaussian-weighted blur — the "unsharp" reference the detail is
      // measured against.
      vec3 blur = vec3(0.0);
      blur += texture2D(imageTexture, vUv + texel * vec2(-1.0, -1.0)).rgb * 1.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 0.0, -1.0)).rgb * 2.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 1.0, -1.0)).rgb * 1.0;
      blur += texture2D(imageTexture, vUv + texel * vec2(-1.0,  0.0)).rgb * 2.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 0.0,  0.0)).rgb * 4.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 1.0,  0.0)).rgb * 2.0;
      blur += texture2D(imageTexture, vUv + texel * vec2(-1.0,  1.0)).rgb * 1.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 0.0,  1.0)).rgb * 2.0;
      blur += texture2D(imageTexture, vUv + texel * vec2( 1.0,  1.0)).rgb * 1.0;
      blur /= 16.0;

      // Push the pixel away from its blurred self: local contrast, amplified.
      vec3 result = c + (c - blur) * amount;
      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
