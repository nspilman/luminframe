import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

// Outline lets the machine do the one thing it never could: describe a shape
// rather than smear it. A Sobel operator measures how fast brightness changes
// across each pixel's neighborhood; where it changes fast, there is an edge.
export const outline = createShaderRecord({
  name: "Outline",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('threshold').asRange('Threshold', 0.2, 0.0, 1.0, 0.01),
    createShaderVariable('thickness').asRange('Thickness', 1.0, 0.5, 4.0, 0.1),
    createShaderVariable('lineColor').asVec3('Line Color', 1.0, 1.0, 1.0),
    createShaderVariable('overImage').asBoolean('Draw Over Image', false),
  ],
  body: `
    float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      vec2 texel = thickness / resolution;

      float tl = lum(texture2D(imageTexture, vUv + texel * vec2(-1.0, -1.0)).rgb);
      float  t = lum(texture2D(imageTexture, vUv + texel * vec2( 0.0, -1.0)).rgb);
      float tr = lum(texture2D(imageTexture, vUv + texel * vec2( 1.0, -1.0)).rgb);
      float  l = lum(texture2D(imageTexture, vUv + texel * vec2(-1.0,  0.0)).rgb);
      float  r = lum(texture2D(imageTexture, vUv + texel * vec2( 1.0,  0.0)).rgb);
      float bl = lum(texture2D(imageTexture, vUv + texel * vec2(-1.0,  1.0)).rgb);
      float  b = lum(texture2D(imageTexture, vUv + texel * vec2( 0.0,  1.0)).rgb);
      float br = lum(texture2D(imageTexture, vUv + texel * vec2( 1.0,  1.0)).rgb);

      // Sobel gradient magnitude — how steeply brightness changes here.
      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
      float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
      float edge = smoothstep(threshold, threshold + 0.15, length(vec2(gx, gy)));

      // Lines over black by default, or laid over the original.
      vec3 base = overImage ? texture2D(imageTexture, vUv).rgb : vec3(0.0);
      gl_FragColor = vec4(mix(base, lineColor, edge), 1.0);
    }
  `
});
