import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Bloom is the romance of overexposure: the bright parts of the image spill soft
// light into everything around them. Threshold the highlights, blur them, and
// screen the glow back over the original.
export const bloom = createShaderRecord({
  name: "Bloom",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 1.0, 0.0, 3.0, 0.05),
    createShaderVariable('threshold').asRange('Threshold', 0.6, 0.0, 1.0, 0.01),
    createShaderVariable('radius').asRange('Radius', 8.0, 1.0, 30.0, 0.5),
  ],
  body: `
    void main() {
      vec3 c = texture2D(imageTexture, vUv).rgb;

      // Gather only the light above the threshold, weighted by a gaussian falloff.
      vec3 bloom = vec3(0.0);
      float total = 0.0;
      for (float i = -3.0; i <= 3.0; i += 1.0) {
        for (float j = -3.0; j <= 3.0; j += 1.0) {
          vec2 off = vec2(i, j) * radius / resolution;
          vec3 s = texture2D(imageTexture, vUv + off).rgb;
          float bright = max(0.0, dot(s, vec3(0.299, 0.587, 0.114)) - threshold);
          float w = exp(-(i * i + j * j) / 6.0);
          bloom += s * bright * w;
          total += w;
        }
      }
      bloom /= total;

      // Screen blend — light adds, it never darkens.
      vec3 result = 1.0 - (1.0 - c) * (1.0 - bloom * intensity);
      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
});
