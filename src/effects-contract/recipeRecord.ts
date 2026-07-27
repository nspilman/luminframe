import {
  EFFECT_COLLECTION,
  MAX_MACROS,
  MAX_NAME_LENGTH,
  MAX_PARAMS_JSON_LENGTH,
  MAX_STEPS,
  MAX_STEP_KEY_LENGTH,
  PARAM_NAME_PATTERN,
  RECIPE_COLLECTION,
  STEP_KEY_PATTERN,
} from './constants'
import {
  MacroBinding,
  MacroDef,
  RecipeDefinition,
  RecipeRecordWire,
  RecipeStepDef,
  StepParamValue,
} from './types'
import { isFiniteNumber, isRecord } from './predicates'

/**
 * The two directions of a Look across the wire boundary, in the effect
 * record's mold: `parseRecipeRecord` is the trust boundary and collects ALL
 * violations; `buildRecipeRecord` is the pure write direction.
 *
 * The grammar judges only what the record alone can prove: shapes, lengths,
 * the step-key form, and macro bindings' referential integrity against the
 * step list. Whether a step's effect actually resolves — and whether a bound
 * param exists on it — needs the loaded effect, so that judgment belongs to
 * apply time, the same split as effect parse vs compile-gate.
 */

export type RecipeParseResult =
  | { ok: true; def: RecipeDefinition }
  | { ok: false; errors: string[] }

const isStepParamValue = (v: unknown): v is StepParamValue =>
  isFiniteNumber(v) ||
  typeof v === 'string' ||
  typeof v === 'boolean' ||
  (Array.isArray(v) && v.every(isFiniteNumber))

/**
 * Why a step key can't anchor a published Look, or null when it can. A key is
 * either a builtin effect name or the at:// URI of a published effect —
 * anything device-local (draft://, local://) resolves for nobody else, and a
 * recipe URI would make a Look contain a Look.
 */
function stepKeyViolation(type: string): string | null {
  if (type.length === 0 || type.length > MAX_STEP_KEY_LENGTH) {
    return `key must be 1–${MAX_STEP_KEY_LENGTH} chars`
  }
  if (type.startsWith('at://')) {
    const parts = type.slice('at://'.length).split('/')
    const [did, collection, rkey] = parts
    if (parts.length !== 3 || !did || !collection || !rkey) return 'malformed at:// URI'
    if (collection === RECIPE_COLLECTION) return 'a Look cannot contain another Look'
    if (collection !== EFFECT_COLLECTION) return `must reference a ${EFFECT_COLLECTION} record`
    return null
  }
  if (type.includes('://')) {
    return 'references an unpublished effect (draft/local keys resolve only on this device) — publish it first'
  }
  if (!STEP_KEY_PATTERN.test(type)) {
    return 'must be a builtin effect key or an at:// effect URI'
  }
  return null
}

/** Validate one wire step; push named errors, return the def when clean. */
function parseStep(value: unknown, index: number, errors: string[]): RecipeStepDef | null {
  const at = `step ${index + 1}`
  if (!isRecord(value)) {
    errors.push(`${at}: must be an object`)
    return null
  }
  const type = value.type
  if (typeof type !== 'string') {
    errors.push(`${at}: type must be a string`)
    return null
  }
  const keyViolation = stepKeyViolation(type)
  if (keyViolation) {
    errors.push(`${at} (${type || 'empty'}): ${keyViolation}`)
    return null
  }
  const subject = `${at} (${type})`
  if (value.params === undefined) return { type }
  if (typeof value.params !== 'string' || value.params.length > MAX_PARAMS_JSON_LENGTH) {
    errors.push(`${subject}: params must be a JSON string of at most ${MAX_PARAMS_JSON_LENGTH} chars`)
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(value.params)
  } catch {
    parsed = undefined
  }
  if (!isRecord(parsed)) {
    errors.push(`${subject}: params is not a valid JSON object`)
    return null
  }
  const params: Record<string, StepParamValue> = {}
  let clean = true
  for (const [key, stored] of Object.entries(parsed)) {
    if (!isStepParamValue(stored)) {
      errors.push(`${subject}: param "${key}" must be a number, string, boolean, or number array`)
      clean = false
      continue
    }
    params[key] = stored
  }
  return clean ? { type, params } : null
}

/** Validate one macro entry against the step list's length. */
function parseMacro(
  value: unknown,
  index: number,
  stepCount: number,
  errors: string[]
): MacroDef | null {
  const at = `macro ${index + 1}`
  if (!isRecord(value)) {
    errors.push(`${at}: must be an object`)
    return null
  }
  const name = value.name
  const subject = `macro "${typeof name === 'string' ? name : `#${index + 1}`}"`
  if (typeof name !== 'string' || !PARAM_NAME_PATTERN.test(name)) {
    errors.push(`${at}: name must be an identifier (letters, digits, underscore)`)
    return null
  }
  if (typeof value.label !== 'string' || value.label.length === 0) {
    errors.push(`${subject}: label required`)
    return null
  }
  if (!isFiniteNumber(value.default) || value.default < 0 || value.default > 1) {
    errors.push(`${subject}: default must be a number 0..1`)
    return null
  }
  if (!Array.isArray(value.bindings) || value.bindings.length === 0) {
    errors.push(`${subject}: needs at least one binding`)
    return null
  }
  const bindings: MacroBinding[] = []
  let clean = true
  value.bindings.forEach((binding: unknown, b: number) => {
    const bindingAt = `${subject} binding ${b + 1}`
    if (!isRecord(binding)) {
      errors.push(`${bindingAt}: must be an object`)
      clean = false
      return
    }
    const violations: string[] = []
    if (!Number.isInteger(binding.step) || (binding.step as number) < 0 || (binding.step as number) >= stepCount) {
      violations.push(`step must be an integer 0..${stepCount - 1}`)
    }
    if (typeof binding.param !== 'string' || !PARAM_NAME_PATTERN.test(binding.param)) {
      violations.push('param must be an identifier')
    }
    if (binding.from !== undefined && !isFiniteNumber(binding.from)) violations.push('from must be a finite number')
    if (binding.to !== undefined && !isFiniteNumber(binding.to)) violations.push('to must be a finite number')
    if (violations.length > 0) {
      errors.push(...violations.map((m) => `${bindingAt}: ${m}`))
      clean = false
      return
    }
    bindings.push({
      step: binding.step as number,
      param: binding.param as string,
      ...(binding.from !== undefined ? { from: binding.from as number } : {}),
      ...(binding.to !== undefined ? { to: binding.to as number } : {}),
    })
  })
  return clean ? { name, label: value.label, default: value.default, bindings } : null
}

export function parseRecipeRecord(value: unknown): RecipeParseResult {
  const errors: string[] = []
  if (!isRecord(value)) {
    return { ok: false, errors: ['record: must be an object'] }
  }

  const name = value.name
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) {
    errors.push(`name: required, 1–${MAX_NAME_LENGTH} chars`)
  }

  const description = value.description
  if (description !== undefined && typeof description !== 'string') {
    errors.push('description: must be a string when present')
  }

  const steps: RecipeStepDef[] = []
  let stepCount = 0
  if (!Array.isArray(value.steps) || value.steps.length === 0 || value.steps.length > MAX_STEPS) {
    errors.push(`steps: required, 1–${MAX_STEPS} entries`)
  } else {
    stepCount = value.steps.length
    value.steps.forEach((entry, i) => {
      const step = parseStep(entry, i, errors)
      if (step) steps.push(step)
    })
  }

  const macros: MacroDef[] = []
  if (value.macros !== undefined) {
    if (typeof value.macros !== 'string' || value.macros.length > MAX_PARAMS_JSON_LENGTH) {
      errors.push(`macros: must be a JSON string of at most ${MAX_PARAMS_JSON_LENGTH} chars`)
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(value.macros)
      } catch {
        parsed = undefined
      }
      if (!Array.isArray(parsed) || parsed.length > MAX_MACROS) {
        errors.push(`macros: not a valid JSON array of at most ${MAX_MACROS} entries`)
      } else {
        parsed.forEach((entry, i) => {
          const macro = parseMacro(entry, i, stepCount, errors)
          if (macro) macros.push(macro)
        })
        const seen = new Set<string>()
        for (const m of macros) {
          if (seen.has(m.name)) errors.push(`macro "${m.name}": duplicate name`)
          seen.add(m.name)
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    def: {
      name: name as string,
      ...(typeof description === 'string' && description.length > 0 ? { description } : {}),
      steps,
      ...(macros.length > 0 ? { macros } : {}),
    },
  }
}

export function buildRecipeRecord(def: RecipeDefinition, createdAt: string): RecipeRecordWire {
  return {
    $type: 'com.luminframe.recipe',
    name: def.name,
    ...(def.description ? { description: def.description } : {}),
    steps: def.steps.map((step) =>
      step.params && Object.keys(step.params).length > 0
        ? { type: step.type, params: JSON.stringify(step.params) }
        : { type: step.type }
    ),
    ...(def.macros && def.macros.length > 0 ? { macros: JSON.stringify(def.macros) } : {}),
    createdAt,
  }
}
