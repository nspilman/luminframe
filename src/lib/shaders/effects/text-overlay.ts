import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const textOverlay = createShaderRecord({
  name: "Text",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    // The typed string. Declared sampler2D because that is what the shader
    // receives — the adapter rasterizes the glyphs on the way to the GPU.
    createShaderVariable('textTexture').asText('Text', 'HELLO', 'Type something'),
    // Normalized to the picture, so 0.5/0.5 is dead centre and the same
    // position means the same place whatever the photo's size.
    createShaderVariable('textPosition').asVec2('Position', 0.5, 0.5, {
      min: [0, 0],
      max: [1, 1],
      step: [0.01, 0.01],
    }),
    createShaderVariable('textSize').asRange('Size', 0.6, 0.05, 2.0, 0.01),
    createShaderVariable('textAngle').asRange('Angle', 0, -180, 180, 1),
    createShaderVariable('textColor').asVec3('Color', 1, 1, 1),
  ],
  body: `
    void main() {
      vec3 base = texture2D(imageTexture, vUv).rgb;

      // Into the caption's own space: shift so its centre sits at Position,
      // undo the picture's aspect so the letters stay the shape they were
      // drawn, spin, then scale. The texture is a square tile (see
      // renderTextCanvas), so nothing extra need describe its width.
      vec2 d = vUv - textPosition;
      d.x *= resolution.x / resolution.y;

      float a = radians(textAngle);
      float c = cos(a);
      float s = sin(a);
      vec2 r = vec2(d.x * c - d.y * s, d.x * s + d.y * c);

      vec2 q = r / max(textSize, 0.001) + 0.5;

      // Outside the tile there is no caption. Sampling is clamped, so without
      // this the edge row of pixels would smear out across the picture.
      float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);

      // The glyphs live in the alpha channel — the canvas draws them white on
      // transparent so colour stays a dial here rather than something baked
      // into the texture and re-rasterized on every change.
      //
      // Sampled with q as-is: Canvas 2D draws y-down, but the texture is
      // uploaded with Three's default flipY, which already turns it the right
      // way up. Flipping again here is what stands the letters on their heads.
      float glyph = texture2D(textTexture, q).a * inside;

      gl_FragColor = vec4(mix(base, textColor, glyph), 1.0);
    }
  `
});
