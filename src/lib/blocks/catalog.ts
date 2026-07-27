import { OpSpec } from './types'

/**
 * The Blocks vocabulary — every operation a row can be. One op per entry;
 * adding an op here puts it in the room's add-list, the grammar, and the
 * compiler at once. Emitters write GLSL ES 1.00 expressions and must respect
 * the effect grammar the compiled body is judged by: never the token
 * `uniform`, never `lfFragColor`/`lfEffectMain`, and helper functions must
 * not contain `void main(` (the opacity wrap renames the first occurrence).
 */

/** Shared 2D hash — the one noise seed used by every stochastic op. */
const HASH_HELPER = `float lfbHash(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}`

const LUMA = 'vec3(0.299, 0.587, 0.114)'

/** The seed ops the grammar and compiler are built against; R3 grows the set. */
export const OP_CATALOG: Record<string, OpSpec> = {
  sample: {
    key: 'sample',
    name: 'Sample',
    blurb: 'Read the photo at a position',
    out: 'vec3',
    // Unwired uv reads the pixel's own position — the plain photo.
    args: { uv: { type: 'vec2', optional: true } },
    knobs: {},
    emit: (ctx) => `texture2D(imageTexture, ${ctx.arg('uv') ?? 'vUv'}).rgb`,
  },

  luminance: {
    key: 'luminance',
    name: 'Luminance',
    blurb: 'How bright each pixel is',
    out: 'float',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: {},
    emit: (ctx) => `dot(${ctx.arg('in')}, ${LUMA})`,
  },

  mix: {
    key: 'mix',
    name: 'Mix',
    blurb: 'Blend two colors — by a knob, or by a mask',
    out: 'vec3',
    args: {
      a: { type: 'vec3', default: 'source' },
      b: { type: 'vec3', default: 'current' },
      t: { type: 'float', optional: true },
    },
    knobs: { amount: { kind: 'range', label: 'Amount', default: 0.5, min: 0, max: 1, step: 0.01 } },
    emit: (ctx) => `mix(${ctx.arg('a')}, ${ctx.arg('b')}, ${ctx.arg('t') ?? ctx.knob('amount')})`,
  },
}

/** Every helper an op family shares, exported for the compiler's dedup. */
export const SHARED_HELPERS = { HASH_HELPER }
