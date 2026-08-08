import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig'

/**
 * Test fixtures. The bundled effects used to double as everyone's fixtures;
 * with the library living in canon (com.luminframe.effect records), tests
 * build their subjects here instead — through the same factory production
 * hydration uses, so a fixture can't drift from what a real effect is.
 *
 * One fixture per behavior under test, not per production effect: a still
 * effect, an animated one, a gated one, one with an extra image slot.
 */

/** No time reference — never animates. */
export const stillEffect = createShaderRecord({
  name: 'Still',
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amount').asRange('Amount', 1, 0, 1, 0.01),
  ],
  body: 'void main() { gl_FragColor = texture2D(imageTexture, vUv) * amount; }',
})

/** References time with no gate — always animates. */
export const animatedEffect = createShaderRecord({
  name: 'Animated',
  variables: [createShaderVariable('imageTexture').asImage('Source Image')],
  body: 'void main() { gl_FragColor = texture2D(imageTexture, vUv + sin(time)); }',
})

/** References time, gated by `drift` — still at zero. */
export const gatedEffect = createShaderRecord({
  name: 'Gated',
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('drift').asRange('Drift', 0, 0, 1, 0.01),
  ],
  body: 'void main() { gl_FragColor = texture2D(imageTexture, vUv + drift * sin(time)); }',
  animatedBy: 'drift',
})

/** Declares an extra image slot beside the pass input. */
export const twoImageEffect = createShaderRecord({
  name: 'Two Image',
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('imageTextureTwo').asImage('Second Image'),
    createShaderVariable('mixAmount').asRange('Mix', 0.5, 0, 1, 0.01),
  ],
  body: 'void main() { gl_FragColor = mix(texture2D(imageTexture, vUv), texture2D(imageTextureTwo, vUv), mixAmount); }',
})

/** A color-param effect, for hydration/serialization round trips. */
export const tintEffect = createShaderRecord({
  name: 'Tint',
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('tintColor').asVec3('Tint Color', 1, 0.5, 0),
  ],
  body: 'void main() { gl_FragColor = vec4(texture2D(imageTexture, vUv).rgb * tintColor, 1.0); }',
})
