import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const lightThresholdSwap = createShaderRecord({
  name: "Tone Swap",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Second Image'),
    createShaderVariable('threshold').asRange('Light Threshold', 383, 0.0, 765.0, 1.0),
    createShaderVariable('isHighPass').asBoolean('High Pass Filter'),
    // Transition amount defaults to 0 — the hard cut this effect has always
    // made. Tone Swap is old enough to have published images resting on it,
    // and a saved recipe that predates these two knobs is filled from the
    // defaults, so a softer default would quietly restyle finished work.
    createShaderVariable('transitionAmount').asRange('Transition amount', 0, 0.0, 1.0, 0.01),
    createShaderVariable('transitionSize').asRange('Transition size', 60, 0.0, 255.0, 1.0),
  ],
  body: `
    float getLightValue(vec4 color) {
      return (color.r + color.g + color.b) * 255.0;
    }

    void main() {
      vec2 uv = vUv;

      vec4 color1 = texture2D(imageTexture, uv);
      vec4 color2 = texture2D(imageTextureTwo, uv);

      float lightness = getLightValue(color1);

      // Two ways to answer "is this pixel above the line", and a dial between
      // them. step is the clean break this effect has always made; smoothstep
      // rides across a band centred on the threshold, so the threshold stays
      // the halfway point and the transition reaches half its size either side.
      // max() keeps smoothstep off its 0/0 case at size 0.
      float halfBand = max(transitionSize, 0.001) * 0.5;
      float above = mix(
        step(threshold, lightness),
        smoothstep(threshold - halfBand, threshold + halfBand, lightness),
        transitionAmount
      );

      // High pass: use image2 below the threshold. Low pass: above it.
      float useImageTwo = isHighPass ? 1.0 - above : above;

      gl_FragColor = mix(color1, color2, useImageTwo);
    }
  `
});