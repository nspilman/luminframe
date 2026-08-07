import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const lightThresholdSwap = createShaderRecord({
  name: "Tone Swap",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Second Image'),
    createShaderVariable('threshold').asRange('Light Threshold', 383, 0.0, 765.0, 1.0),
    createShaderVariable('isHighPass').asBoolean('High Pass Filter'),
    // Transition size is a distance across the picture, in pixels — not a
    // width in tone. Tone is the wrong space to soften in: at a real object
    // boundary lightness leaps hundreds of units between neighbouring pixels,
    // so any band in tone still lands on a single pixel and the break survives
    // exactly where the eye is drawn to it. Feathering the selection itself,
    // over pixels, is what actually blurs that line.
    //
    // Size is also the live dial, so it comes first: raising it from 0 softens
    // immediately, with no second knob to arm. 0 is the hard cut this effect
    // has always made — Tone Swap is old enough to have published images
    // resting on it, and a saved recipe predating these knobs is filled from
    // the defaults, so anything but 0 would quietly restyle finished work.
    createShaderVariable('transitionSize').asRange('Transition size', 0, 0.0, 48.0, 0.5),
    createShaderVariable('transitionAmount').asRange('Transition amount', 1, 0.0, 1.0, 0.01),
  ],
  body: `
    float getLightValue(vec4 color) {
      return (color.r + color.g + color.b) * 255.0;
    }

    // Which image this point asks for, before any softening: 1 is the second
    // image, 0 the first. High pass takes the second image below the
    // threshold, low pass above it.
    float selectionAt(vec2 uv) {
      float above = step(threshold, getLightValue(texture2D(imageTexture, uv)));
      return isHighPass ? 1.0 - above : above;
    }

    void main() {
      vec2 uv = vUv;

      vec4 color1 = texture2D(imageTexture, uv);
      vec4 color2 = texture2D(imageTextureTwo, uv);

      float hard = selectionAt(uv);

      // The feather: ask the same question across a small disc of neighbours
      // and average the answers, so a point near the line lands part-way
      // between the two images in proportion to how much of its neighbourhood
      // fell each side. Radius comes off resolution — the source image's own
      // pixel size — so a 12px feather is 12px of the photo whether it is being
      // previewed small or exported full size.
      // ponytail: 7x7 box, so the taps sit size/3 apart and the seams between
      // them stay under the eye until the top of the range. A wider feather
      // than this wants a separable two-pass blur, which one effect (one pass)
      // can't do — that is what the range is capped for.
      vec2 tap = (transitionSize / resolution) / 3.0;
      float sum = 0.0;
      for (int y = -3; y <= 3; y++) {
        for (int x = -3; x <= 3; x++) {
          sum += selectionAt(uv + vec2(float(x), float(y)) * tap);
        }
      }
      float soft = sum / 49.0;

      // At size 0 every tap lands on the same texel, so soft equals hard and
      // the result is the old clean break no matter where amount sits.
      float useImageTwo = mix(hard, soft, transitionAmount);

      gl_FragColor = mix(color1, color2, useImageTwo);
    }
  `
});