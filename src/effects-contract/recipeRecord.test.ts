import { buildRecipeRecord, parseRecipeRecord } from './recipeRecord'
import { RecipeDefinition } from './types'

/**
 * The Look grammar's contract tests, in the effect grammar's mold: each
 * rejection pins one named rule, the round-trip pins that the two wire
 * directions agree.
 */

const validDef: RecipeDefinition = {
  name: 'Dreamy Film',
  description: 'Soft blur under warm grain',
  steps: [
    { type: 'blur', params: { radius: 4, opacity: 0.8 } },
    { type: 'at://did:plc:abc123/com.luminframe.effect/warm-grain', params: { amount: 0.5 } },
    { type: 'crossHatch' },
  ],
  macros: [
    {
      name: 'dreaminess',
      label: 'Dreaminess',
      default: 0.5,
      bindings: [
        { step: 0, param: 'radius', from: 0, to: 10 },
        { step: 1, param: 'amount' },
      ],
    },
  ],
}

const wire = (overrides: Record<string, unknown> = {}) => ({
  ...buildRecipeRecord(validDef, '2026-07-26T00:00:00.000Z'),
  ...overrides,
})

/** Parse a wire record expected to fail; return its errors. */
const errorsOf = (overrides: Record<string, unknown>): string[] => {
  const result = parseRecipeRecord(wire(overrides))
  if (result.ok) throw new Error('expected parse to fail')
  return result.errors
}

const macros = (entries: unknown[]) => JSON.stringify(entries)

describe('parseRecipeRecord', () => {
  it('round-trips a built record back to the definition', () => {
    expect(parseRecipeRecord(wire())).toEqual({ ok: true, def: validDef })
  })

  it('non-object → record error', () => {
    expect(parseRecipeRecord(null)).toEqual({ ok: false, errors: ['record: must be an object'] })
  })

  it('missing name → name error', () => {
    expect(errorsOf({ name: undefined })).toContain('name: required, 1–64 chars')
  })

  it('empty steps → steps error', () => {
    expect(errorsOf({ steps: [] })).toContain('steps: required, 1–64 entries')
  })

  it('65 steps → steps error', () => {
    // MAX_STEPS is 64, matching the image record's recipe cap.
    expect(errorsOf({ steps: Array(65).fill({ type: 'blur' }) })).toContain(
      'steps: required, 1–64 entries'
    )
  })

  it('step keyed by a recipe URI → Look-in-Look error', () => {
    const steps = [{ type: 'at://did:plc:abc123/com.luminframe.recipe/other-look' }]
    expect(errorsOf({ steps })).toContain(
      'step 1 (at://did:plc:abc123/com.luminframe.recipe/other-look): a Look cannot contain another Look'
    )
  })

  it('step keyed by a non-effect collection → collection error', () => {
    const steps = [{ type: 'at://did:plc:abc123/com.luminframe.image/xyz' }]
    expect(errorsOf({ steps })).toContain(
      'step 1 (at://did:plc:abc123/com.luminframe.image/xyz): must reference a com.luminframe.effect record'
    )
  })

  it('step keyed by a draft:// key → unpublished-effect error', () => {
    expect(errorsOf({ steps: [{ type: 'draft://my-shader' }] })).toContain(
      'step 1 (draft://my-shader): references an unpublished effect (draft/local keys resolve only on this device) — publish it first'
    )
  })

  it('step keyed by a malformed at:// URI → URI error', () => {
    expect(errorsOf({ steps: [{ type: 'at://did:plc:abc123' }] })).toContain(
      'step 1 (at://did:plc:abc123): malformed at:// URI'
    )
  })

  it('step params not JSON → params error', () => {
    expect(errorsOf({ steps: [{ type: 'blur', params: '{oops' }] })).toContain(
      'step 1 (blur): params is not a valid JSON object'
    )
  })

  it('step param holding a non-recipe value → value error', () => {
    expect(errorsOf({ steps: [{ type: 'blur', params: '{"radius":{"deep":1}}' }] })).toContain(
      'step 1 (blur): param "radius" must be a number, string, boolean, or number array'
    )
  })

  it('macros not a JSON array → macros error', () => {
    expect(errorsOf({ macros: '{oops' })).toContain(
      'macros: not a valid JSON array of at most 8 entries'
    )
  })

  it('macro binding step at the list length → range error', () => {
    // validDef has 3 steps, so 2 is the last valid index and 3 is out.
    const bad = macros([
      { name: 'grit', label: 'Grit', default: 0, bindings: [{ step: 3, param: 'radius' }] },
    ])
    expect(errorsOf({ macros: bad })).toContain(
      'macro "grit" binding 1: step must be an integer 0..2'
    )
  })

  it('macro binding to the last step passes', () => {
    const last = macros([
      { name: 'grit', label: 'Grit', default: 1, bindings: [{ step: 2, param: 'opacity' }] },
    ])
    expect(parseRecipeRecord(wire({ macros: last })).ok).toBe(true)
  })

  it('macro default above 1 → default error', () => {
    const bad = macros([
      { name: 'grit', label: 'Grit', default: 1.1, bindings: [{ step: 0, param: 'radius' }] },
    ])
    expect(errorsOf({ macros: bad })).toContain('macro "grit": default must be a number 0..1')
  })

  it('macro without bindings → bindings error', () => {
    const bad = macros([{ name: 'grit', label: 'Grit', default: 0.5, bindings: [] }])
    expect(errorsOf({ macros: bad })).toContain('macro "grit": needs at least one binding')
  })

  it('duplicate macro names → duplicate error', () => {
    const m = { name: 'grit', label: 'Grit', default: 0.5, bindings: [{ step: 0, param: 'radius' }] }
    expect(errorsOf({ macros: macros([m, m]) })).toContain('macro "grit": duplicate name')
  })

  it('collects every violation, not just the first', () => {
    const errors = errorsOf({ name: '', steps: [{ type: 'draft://x' }, { type: 'blur' }] })
    expect(errors).toEqual([
      'name: required, 1–64 chars',
      'step 1 (draft://x): references an unpublished effect (draft/local keys resolve only on this device) — publish it first',
    ])
  })
})

describe('buildRecipeRecord', () => {
  it('pins the wire shape', () => {
    expect(buildRecipeRecord(validDef, '2026-07-26T00:00:00.000Z')).toMatchInlineSnapshot(`
{
  "$type": "com.luminframe.recipe",
  "createdAt": "2026-07-26T00:00:00.000Z",
  "description": "Soft blur under warm grain",
  "macros": "[{"name":"dreaminess","label":"Dreaminess","default":0.5,"bindings":[{"step":0,"param":"radius","from":0,"to":10},{"step":1,"param":"amount"}]}]",
  "name": "Dreamy Film",
  "steps": [
    {
      "params": "{"radius":4,"opacity":0.8}",
      "type": "blur",
    },
    {
      "params": "{"amount":0.5}",
      "type": "at://did:plc:abc123/com.luminframe.effect/warm-grain",
    },
    {
      "type": "crossHatch",
    },
  ],
}
`)
  })

  it('omits absent optional fields', () => {
    const record = buildRecipeRecord({ name: 'Bare', steps: [{ type: 'blur' }] }, '2026-07-26T00:00:00.000Z')
    expect('description' in record).toBe(false)
    expect('macros' in record).toBe(false)
    expect('params' in record.steps[0]).toBe(false)
  })
})
