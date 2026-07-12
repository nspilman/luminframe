import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Tilt-shift keeps one horizontal band sharp and blurs everything above and
// below it. The eye reads shallow depth of field as *small*, so a real city
// turns into a model railroad.
export const tiltShift = createShaderRecord({
  name: "Tilt Shift",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('focusY').asRange('Focus Line', 0.5, 0.0, 1.0, 0.01),
    createShaderVariable('bandWidth').asRange('Band Width', 0.15, 0.02, 0.5, 0.01),
    createShaderVariable('blurAmount').asRange('Blur', 4.0, 1.0, 10.0, 0.5),
  ],
  body: `
    void main() {
      vec3 sharp = texture2D(imageTexture, vUv).rgb;

      // Gaussian blur of the neighborhood.
      vec3 blur = vec3(0.0);
      float total = 0.0;
      for (float i = -3.0; i <= 3.0; i += 1.0) {
        for (float j = -3.0; j <= 3.0; j += 1.0) {
          vec2 off = vec2(i, j) * blurAmount / resolution;
          float w = exp(-(i * i + j * j) / 6.0);
          blur += texture2D(imageTexture, vUv + off).rgb * w;
          total += w;
        }
      }
      blur /= total;

      // Sharp inside the band around focusY, blurred outside it.
      float d = abs(vUv.y - focusY);
      float blurW = smoothstep(bandWidth, bandWidth + 0.15, d);

      gl_FragColor = vec4(mix(sharp, blur, blurW), 1.0);
    }
  `
});
