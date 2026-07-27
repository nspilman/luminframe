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

/** Rotation about the frame's center — shared by the uv ops. */
const ROTATE_HELPER = `vec2 lfbRotate(vec2 uv, float a) {
  vec2 p = uv - vec2(0.5, 0.5);
  float c = cos(a);
  float s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c) + vec2(0.5, 0.5);
}`

const CENTER = 'vec2(0.5, 0.5)'

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

  invert: {
    key: 'invert',
    name: 'Invert',
    blurb: 'Flip a color to its negative',
    out: 'vec3',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: {},
    emit: (ctx) => `vec3(1.0) - ${ctx.arg('in')}`,
  },

  tint: {
    key: 'tint',
    name: 'Tint',
    blurb: 'Wash a color through another',
    out: 'vec3',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: { color: { kind: 'color', label: 'Color', default: [1, 0.85, 0.65] } },
    emit: (ctx) => `${ctx.arg('in')} * ${ctx.knob('color')}`,
  },

  channels: {
    key: 'channels',
    name: 'Channels',
    blurb: 'Weigh red, green, and blue separately',
    out: 'vec3',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: {
      r: { kind: 'range', label: 'Red', default: 1, min: 0, max: 2, step: 0.01 },
      g: { kind: 'range', label: 'Green', default: 1, min: 0, max: 2, step: 0.01 },
      b: { kind: 'range', label: 'Blue', default: 1, min: 0, max: 2, step: 0.01 },
    },
    emit: (ctx) => `${ctx.arg('in')} * vec3(${ctx.knob('r')}, ${ctx.knob('g')}, ${ctx.knob('b')})`,
  },

  posterize: {
    key: 'posterize',
    name: 'Posterize',
    blurb: 'Flatten a color to a few bands',
    out: 'vec3',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: { levels: { kind: 'range', label: 'Levels', default: 4, min: 2, max: 12, step: 1 } },
    emit: (ctx) => `floor(${ctx.arg('in')} * ${ctx.knob('levels')}) / ${ctx.knob('levels')}`,
  },

  curve: {
    key: 'curve',
    name: 'Curve',
    blurb: 'Bend the tones — darker or lighter mids',
    out: 'vec3',
    args: { in: { type: 'vec3', default: 'current' } },
    knobs: { gamma: { kind: 'range', label: 'Gamma', default: 1, min: 0.2, max: 3, step: 0.01 } },
    emit: (ctx) => `pow(max(${ctx.arg('in')}, vec3(0.0)), vec3(${ctx.knob('gamma')}))`,
  },

  colorize: {
    key: 'colorize',
    name: 'Colorize',
    blurb: 'Paint a value between two colors — masks become duotones',
    out: 'vec3',
    args: { t: { type: 'float', default: 'current' } },
    knobs: {
      dark: { kind: 'color', label: 'Dark', default: [0.1, 0.1, 0.3] },
      light: { kind: 'color', label: 'Light', default: [1, 0.9, 0.7] },
    },
    emit: (ctx) => `mix(${ctx.knob('dark')}, ${ctx.knob('light')}, clamp(${ctx.arg('t')}, 0.0, 1.0))`,
  },

  threshold: {
    key: 'threshold',
    name: 'Threshold',
    blurb: 'Split a value into below and above, with a soft edge',
    out: 'float',
    args: { in: { type: 'float', default: 'current' } },
    knobs: {
      center: { kind: 'range', label: 'Center', default: 0.5, min: 0, max: 1, step: 0.01 },
      softness: { kind: 'range', label: 'Softness', default: 0.1, min: 0, max: 0.5, step: 0.01 },
    },
    emit: (ctx) =>
      `smoothstep(${ctx.knob('center')} - ${ctx.knob('softness')}, ${ctx.knob('center')} + ${ctx.knob('softness')}, ${ctx.arg('in')})`,
  },

  noise: {
    key: 'noise',
    name: 'Noise',
    blurb: 'Random grain on a grid — drift makes it live',
    out: 'float',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: {
      scale: { kind: 'range', label: 'Scale', default: 40, min: 1, max: 200, step: 1 },
      drift: { kind: 'range', label: 'Drift', default: 0, min: 0, max: 2, step: 0.01 },
    },
    // `time` is emitted only when drift can actually be nonzero — a still
    // shader must not read the clock, or the host would treat it as animated.
    emit: (ctx) => {
      const cell = `floor((${ctx.arg('uv') ?? 'vUv'}) * ${ctx.knob('scale')})`
      const moving = ctx.isExposed('drift') || ctx.knobValue('drift') !== 0
      return moving
        ? `lfbHash(${cell} + floor(time * ${ctx.knob('drift')} * 24.0) * 137.0)`
        : `lfbHash(${cell})`
    },
    helpers: [HASH_HELPER],
  },

  radial: {
    key: 'radial',
    name: 'Radial',
    blurb: 'Distance from the center — vignettes start here',
    out: 'float',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: {},
    emit: (ctx) => `distance(${ctx.arg('uv') ?? 'vUv'}, ${CENTER})`,
  },

  zoom: {
    key: 'zoom',
    name: 'Zoom',
    blurb: 'Scale the view about the center',
    out: 'vec2',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: { amount: { kind: 'range', label: 'Amount', default: 1.2, min: 0.25, max: 4, step: 0.01 } },
    emit: (ctx) => `(${ctx.arg('uv') ?? 'vUv'} - ${CENTER}) / ${ctx.knob('amount')} + ${CENTER}`,
  },

  rotate: {
    key: 'rotate',
    name: 'Rotate',
    blurb: 'Turn the view about the center',
    out: 'vec2',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: { angle: { kind: 'range', label: 'Angle', default: 0.3, min: -3.14, max: 3.14, step: 0.01 } },
    emit: (ctx) => `lfbRotate(${ctx.arg('uv') ?? 'vUv'}, ${ctx.knob('angle')})`,
    helpers: [ROTATE_HELPER],
  },

  shift: {
    key: 'shift',
    name: 'Shift',
    blurb: 'Slide the view sideways and up',
    out: 'vec2',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: {
      x: { kind: 'range', label: 'Across', default: 0, min: -0.5, max: 0.5, step: 0.005 },
      y: { kind: 'range', label: 'Up', default: 0, min: -0.5, max: 0.5, step: 0.005 },
    },
    emit: (ctx) => `${ctx.arg('uv') ?? 'vUv'} + vec2(${ctx.knob('x')}, ${ctx.knob('y')})`,
  },

  displace: {
    key: 'displace',
    name: 'Displace',
    blurb: 'Push the view by a value — noise makes glitch',
    out: 'vec2',
    args: {
      uv: { type: 'vec2', optional: true },
      by: { type: 'float', default: 'current' },
    },
    knobs: {
      across: { kind: 'range', label: 'Across', default: 0.05, min: 0, max: 0.3, step: 0.005 },
      up: { kind: 'range', label: 'Up', default: 0, min: 0, max: 0.3, step: 0.005 },
    },
    emit: (ctx) =>
      `${ctx.arg('uv') ?? 'vUv'} + (${ctx.arg('by')} - 0.5) * vec2(${ctx.knob('across')}, ${ctx.knob('up')})`,
  },

  pixelate: {
    key: 'pixelate',
    name: 'Pixelate',
    blurb: 'Snap the view to a coarse grid',
    out: 'vec2',
    args: { uv: { type: 'vec2', optional: true } },
    knobs: { size: { kind: 'range', label: 'Size', default: 12, min: 1, max: 100, step: 1 } },
    emit: (ctx) =>
      `floor((${ctx.arg('uv') ?? 'vUv'}) * resolution / ${ctx.knob('size')}) * ${ctx.knob('size')} / resolution`,
  },
}
