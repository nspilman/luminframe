import { buildEffectRecord, parseEffectRecord } from './effectRecord'
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

  it('wrong env → env error', () => {
    expect(errorsOf({ env: 2 })).toContain('env: unsupported version (this client speaks env 1)')
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
    const params = JSON.stringify([{ type: 'image', name: 'mask', label: 'Mask', default: null }])
    expect(errorsOf({ params })).toContain(
      'param "mask": unknown type (must be range, color, boolean, or vec2)'
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

  it('carries source through the round trip', () => {
    const result = parseEffectRecord(wire({ source: '{"version":1,"ops":[]}' }))
    expect(result).toEqual({ ok: true, def: { ...validDef, source: '{"version":1,"ops":[]}' } })
  })

  it('source over the cap → source error', () => {
    expect(errorsOf({ source: 'x'.repeat(20001) })).toContain(
      'source: must be a string of at most 20000 chars when present'
    )
  })

  it('collects every violation, not just the first', () => {
    const errors = errorsOf({ name: '', env: 9, body: 'void main() { }' })
    expect(errors).toEqual([
      'name: required, 1–64 chars',
      'env: unsupported version (this client speaks env 1)',
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
    expect('source' in record).toBe(false)
  })
})
