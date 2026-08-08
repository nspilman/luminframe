import { buildEffectRecord, minimalEnvFor, parseEffectRecord } from './effectRecord'
import { EffectDefinition } from './types'

/**
 * The grammar's contract tests. Each rejection test pins one named rule so
 * the error vocabulary an author sees can't silently change; the round-trip
 * pins that the two wire directions agree.
 */

const validDef: EffectDefinition = {
  name: 'Invert',
  description: 'Flip every color to its opposite',
  env: 1,
  params: [
    { type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 },
    { type: 'color', name: 'tint', label: 'Tint', default: [1, 0.5, 0] },
    { type: 'boolean', name: 'preserveLuma', label: 'Preserve Luma', default: false },
    { type: 'vec2', name: 'center', label: 'Center', default: [0.5, 0.5] },
  ],
  body: 'void main() { vec3 c = texture2D(imageTexture, vUv).rgb; gl_FragColor = vec4(1.0 - c, 1.0); }',
}

const wire = (overrides: Record<string, unknown> = {}) => ({
  ...buildEffectRecord(validDef, '2026-07-26T00:00:00.000Z'),
  ...overrides,
})

/** Parse a wire record expected to fail; return its errors. */
const errorsOf = (overrides: Record<string, unknown>): string[] => {
  const result = parseEffectRecord(wire(overrides))
  if (result.ok) throw new Error('expected parse to fail')
  return result.errors
}

describe('parseEffectRecord', () => {
  it('round-trips a built record back to the definition', () => {
    const result = parseEffectRecord(wire())
    expect(result).toEqual({ ok: true, def: validDef })
  })

  it('non-object → record error', () => {
    expect(parseEffectRecord('nope')).toEqual({ ok: false, errors: ['record: must be an object'] })
  })

  it('missing name → name error', () => {
    expect(errorsOf({ name: undefined })).toContain('name: required, 1–64 chars')
  })

  it('name over 64 chars → name error', () => {
    expect(errorsOf({ name: 'x'.repeat(65) })).toContain('name: required, 1–64 chars')
  })

  it('env above this client → env error', () => {
    expect(errorsOf({ env: 3 })).toContain('env: unsupported version (this client speaks env 1 through 2)')
  })

  it('env below 1 → env error', () => {
    expect(errorsOf({ env: 0 })).toContain('env: unsupported version (this client speaks env 1 through 2)')
  })

  it('accepts an env-1 record and keeps its claim', () => {
    const result = parseEffectRecord(wire({ env: 1 }))
    if (!result.ok) throw new Error(result.errors.join('; '))
    expect(result.def.env).toBe(1)
  })

  it('params not JSON → params error', () => {
    expect(errorsOf({ params: '{oops' })).toContain('params: not a valid JSON array')
  })

  it('params JSON but not an array → params error', () => {
    expect(errorsOf({ params: '{"a":1}' })).toContain('params: not a valid JSON array')
  })

  it('param named after a reserved uniform → collision error', () => {
    const params = JSON.stringify([
      { type: 'range', name: 'opacity', label: 'Opacity', default: 1, min: 0, max: 1, step: 0.1 },
    ])
    expect(errorsOf({ params })).toContain('param "opacity": collides with a reserved uniform')
  })

  it('param name that is not a GLSL identifier → name error', () => {
    const params = JSON.stringify([
      { type: 'range', name: '2fast', label: 'Speed', default: 0, min: 0, max: 1, step: 0.1 },
    ])
    expect(errorsOf({ params })).toContain(
      'param 1: name must be a GLSL identifier (letters, digits, underscore)'
    )
  })

  it('duplicate param names → duplicate error', () => {
    const p = { type: 'range', name: 'amount', label: 'Amount', default: 0, min: 0, max: 1, step: 0.1 }
    expect(errorsOf({ params: JSON.stringify([p, p]) })).toContain('param "amount": duplicate name')
  })

  it('range with min not below max → bounds error', () => {
    const params = JSON.stringify([
      { type: 'range', name: 'amount', label: 'Amount', default: 1, min: 1, max: 1, step: 0.1 },
    ])
    expect(errorsOf({ params })).toContain('param "amount": min must be less than max')
  })

  it('range with zero step → step error', () => {
    const params = JSON.stringify([
      { type: 'range', name: 'amount', label: 'Amount', default: 0.5, min: 0, max: 1, step: 0 },
    ])
    expect(errorsOf({ params })).toContain('param "amount": step must be greater than 0')
  })

  it('range default outside bounds → default error', () => {
    const params = JSON.stringify([
      { type: 'range', name: 'amount', label: 'Amount', default: 2, min: 0, max: 1, step: 0.1 },
    ])
    expect(errorsOf({ params })).toContain('param "amount": default outside [min, max]')
  })

  it('range with non-finite number → finiteness error', () => {
    const params = '[{"type":"range","name":"amount","label":"Amount","default":null,"min":0,"max":1,"step":0.1}]'
    expect(errorsOf({ params })).toContain(
      'param "amount": default, min, max, step must be finite numbers'
    )
  })

  it('color component above 1 → color error', () => {
    const params = JSON.stringify([{ type: 'color', name: 'tint', label: 'Tint', default: [1, 2, 0] }])
    expect(errorsOf({ params })).toContain(
      'param "tint": default must be [r, g, b] with each component 0..1'
    )
  })

  it('unknown param type → type error', () => {
    const params = JSON.stringify([{ type: 'matrix', name: 'mask', label: 'Mask', default: null }])
    expect(errorsOf({ params })).toContain(
      'param "mask": unknown type (must be range, color, boolean, vec2, image, or text)'
    )
  })

  it('body without void main → body error', () => {
    expect(errorsOf({ body: 'gl_FragColor = vec4(1.0);' })).toContain('body: must contain void main')
  })

  it('body that never writes gl_FragColor → body error', () => {
    expect(errorsOf({ body: 'void main() { }' })).toContain('body: must write gl_FragColor')
  })

  it('body declaring a uniform → generated-declarations error', () => {
    expect(errorsOf({ body: 'uniform float x;\nvoid main() { gl_FragColor = vec4(x); }' })).toContain(
      'body: must not declare uniforms (declarations are generated from params)'
    )
  })

  it('body containing a reserved internal token → token error', () => {
    expect(errorsOf({ body: 'void main() { lfFragColor = vec4(1.0); gl_FragColor = lfFragColor; }' })).toContain(
      'body: reserved token lfFragColor'
    )
  })

  it('animatedBy naming an undeclared param → animatedBy error', () => {
    expect(errorsOf({ animatedBy: 'ghost' })).toContain('animatedBy: must name a declared range param')
  })

  it('animatedBy naming a non-range param → animatedBy error', () => {
    expect(errorsOf({ animatedBy: 'preserveLuma' })).toContain(
      'animatedBy: must name a declared range param'
    )
  })

  it('collects every violation, not just the first', () => {
    const errors = errorsOf({ name: '', env: 9, body: 'void main() { }' })
    expect(errors).toEqual([
      'name: required, 1–64 chars',
      'env: unsupported version (this client speaks env 1 through 2)',
      'body: must write gl_FragColor',
    ])
  })
})

describe('buildEffectRecord', () => {
  it('pins the wire shape', () => {
    expect(buildEffectRecord(validDef, '2026-07-26T00:00:00.000Z')).toMatchInlineSnapshot(`
{
  "$type": "com.luminframe.effect",
  "body": "void main() { vec3 c = texture2D(imageTexture, vUv).rgb; gl_FragColor = vec4(1.0 - c, 1.0); }",
  "createdAt": "2026-07-26T00:00:00.000Z",
  "description": "Flip every color to its opposite",
  "env": 1,
  "name": "Invert",
  "params": "[{"type":"range","name":"amount","label":"Amount","default":1,"min":0,"max":1,"step":0.01},{"type":"color","name":"tint","label":"Tint","default":[1,0.5,0]},{"type":"boolean","name":"preserveLuma","label":"Preserve Luma","default":false},{"type":"vec2","name":"center","label":"Center","default":[0.5,0.5]}]",
}
`)
  })

  it('omits absent optional fields', () => {
    const record = buildEffectRecord({ name: 'Bare', env: 1, params: [], body: validDef.body }, '2026-07-26T00:00:00.000Z')
    expect('description' in record).toBe(false)
    expect('animatedBy' in record).toBe(false)
  })
})

describe('env 2 params', () => {
  const env2 = (params: unknown[]) => wire({ env: 2, params: JSON.stringify(params) })

  const defOf = (params: unknown[]) => {
    const result = parseEffectRecord(env2(params))
    if (!result.ok) throw new Error(result.errors.join('; '))
    return result.def
  }

  it('parses an image param', () => {
    expect(defOf([{ type: 'image', name: 'mask', label: 'Mask' }]).params).toEqual([
      { type: 'image', name: 'mask', label: 'Mask' },
    ])
  })

  it('parses a text param with placeholder', () => {
    expect(
      defOf([{ type: 'text', name: 'caption', label: 'Caption', default: 'HI', placeholder: 'Type' }]).params
    ).toEqual([{ type: 'text', name: 'caption', label: 'Caption', default: 'HI', placeholder: 'Type' }])
  })

  it('text without a string default → default error', () => {
    const result = parseEffectRecord(env2([{ type: 'text', name: 'caption', label: 'Caption' }]))
    if (result.ok) throw new Error('expected parse to fail')
    expect(result.errors).toContain('param "caption": default must be a string')
  })

  it('parses vec2 bounds', () => {
    expect(
      defOf([{ type: 'vec2', name: 'p', label: 'P', default: [0.5, 0.5], min: [0, 0], max: [1, 1], step: [0.01, 0.01] }])
        .params[0]
    ).toEqual({ type: 'vec2', name: 'p', label: 'P', default: [0.5, 0.5], min: [0, 0], max: [1, 1], step: [0.01, 0.01] })
  })

  it('partial vec2 bounds → bounds error', () => {
    const result = parseEffectRecord(env2([{ type: 'vec2', name: 'p', label: 'P', default: [0, 0], min: [0, 0] }]))
    if (result.ok) throw new Error('expected parse to fail')
    expect(result.errors).toContain('param "p": min, max, step must all be [x, y] pairs when bounds are declared')
  })

  it('rejects a fifth texture param', () => {
    const slots = ['a', 'b', 'c', 'd'].map((n) => ({ type: 'image', name: n, label: n.toUpperCase() }))
    const result = parseEffectRecord(
      env2([...slots, { type: 'text', name: 'caption', label: 'Caption', default: '' }])
    )
    if (result.ok) throw new Error('expected parse to fail')
    expect(result.errors).toContain(
      'params: at most 4 image/text params (WebGL1 guarantees only 8 texture units and the host uses 2)'
    )
  })

  it('accepts exactly four texture params', () => {
    const slots = ['a', 'b', 'c', 'd'].map((n) => ({ type: 'image', name: n, label: n.toUpperCase() }))
    expect(defOf(slots).params).toHaveLength(4)
  })

  it('env-1 claim over env-2 params → lying-env error', () => {
    const result = parseEffectRecord(
      wire({ env: 1, params: JSON.stringify([{ type: 'image', name: 'mask', label: 'Mask' }]) })
    )
    if (result.ok) throw new Error('expected parse to fail')
    expect(result.errors).toContain('env: params require env 2 but the record claims env 1')
  })
})

describe('minimalEnvFor', () => {
  it('plain knobs → 1', () => {
    expect(minimalEnvFor(validDef.params)).toBe(1)
  })

  it('image param → 2', () => {
    expect(minimalEnvFor([{ type: 'image', name: 'mask', label: 'Mask' }])).toBe(2)
  })

  it('text param → 2', () => {
    expect(minimalEnvFor([{ type: 'text', name: 'caption', label: 'Caption', default: '' }])).toBe(2)
  })

  it('bounded vec2 → 2', () => {
    expect(
      minimalEnvFor([
        { type: 'vec2', name: 'p', label: 'P', default: [0, 0], min: [0, 0], max: [1, 1], step: [0.01, 0.01] },
      ])
    ).toBe(2)
  })

  it('unbounded vec2 → 1', () => {
    expect(minimalEnvFor([{ type: 'vec2', name: 'p', label: 'P', default: [0, 0] }])).toBe(1)
  })
})
