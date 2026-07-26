import {
  ENV_VERSION,
  MAX_BODY_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PARAMS_JSON_LENGTH,
  PARAM_NAME_PATTERN,
  RESERVED_TOKENS,
  RESERVED_UNIFORMS,
} from './constants'
import { EffectDefinition, EffectParamDef, EffectRecordWire } from './types'

/**
 * The two directions across the wire boundary. `parseEffectRecord` is the
 * trust boundary: a record from the network (or an author's draft) is unknown
 * until every grammar rule has passed. It collects ALL violations rather than
 * stopping at the first, so an author fixing a shader sees the whole list at
 * once. `buildEffectRecord` is the write direction — pure, with `createdAt`
 * passed in so record content is a function of its inputs alone.
 */

export type ParseResult =
  | { ok: true; def: EffectDefinition }
  | { ok: false; errors: string[] }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const isNumberPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every(isFiniteNumber)

const isColorTriple = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => isFiniteNumber(n) && n >= 0 && n <= 1)

/** Validate one parsed param entry; push named errors, return the def when clean. */
function parseParam(value: unknown, index: number, errors: string[]): EffectParamDef | null {
  const at = `param ${index + 1}`
  if (!isRecord(value)) {
    errors.push(`${at}: must be an object`)
    return null
  }
  const name = value.name
  // How this param is referred to in error messages: by name once one exists,
  // by position until then.
  const subject = `param "${typeof name === 'string' ? name : `#${index + 1}`}"`
  if (typeof name !== 'string' || !PARAM_NAME_PATTERN.test(name)) {
    errors.push(`${at}: name must be a GLSL identifier (letters, digits, underscore)`)
    return null
  }
  if ((RESERVED_UNIFORMS as readonly string[]).includes(name) || (RESERVED_TOKENS as readonly string[]).includes(name)) {
    errors.push(`${subject}: collides with a reserved uniform`)
    return null
  }
  if (typeof value.label !== 'string' || value.label.length === 0) {
    errors.push(`${subject}: label required`)
    return null
  }
  const base = { name, label: value.label }
  switch (value.type) {
    case 'range': {
      const { default: def, min, max, step } = value
      if (![def, min, max, step].every(isFiniteNumber)) {
        errors.push(`${subject}: default, min, max, step must be finite numbers`)
        return null
      }
      const violations: string[] = []
      if (!((min as number) < (max as number))) violations.push('min must be less than max')
      if (!((step as number) > 0)) violations.push('step must be greater than 0')
      if ((def as number) < (min as number) || (def as number) > (max as number)) violations.push('default outside [min, max]')
      if (violations.length > 0) {
        errors.push(...violations.map((m) => `${subject}: ${m}`))
        return null
      }
      return { type: 'range', ...base, default: def as number, min: min as number, max: max as number, step: step as number }
    }
    case 'color':
      if (!isColorTriple(value.default)) {
        errors.push(`${subject}: default must be [r, g, b] with each component 0..1`)
        return null
      }
      return { type: 'color', ...base, default: value.default }
    case 'boolean':
      if (typeof value.default !== 'boolean') {
        errors.push(`${subject}: default must be a boolean`)
        return null
      }
      return { type: 'boolean', ...base, default: value.default }
    case 'vec2':
      if (!isNumberPair(value.default)) {
        errors.push(`${subject}: default must be [x, y] finite numbers`)
        return null
      }
      return { type: 'vec2', ...base, default: value.default }
    default:
      errors.push(`${subject}: unknown type (must be range, color, boolean, or vec2)`)
      return null
  }
}

export function parseEffectRecord(value: unknown): ParseResult {
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

  if (value.env !== ENV_VERSION) {
    errors.push(`env: unsupported version (this client speaks env ${ENV_VERSION})`)
  }

  const params: EffectParamDef[] = []
  if (typeof value.params !== 'string' || value.params.length > MAX_PARAMS_JSON_LENGTH) {
    errors.push(`params: must be a JSON string of at most ${MAX_PARAMS_JSON_LENGTH} chars`)
  } else {
    let parsed: unknown
    try {
      parsed = JSON.parse(value.params)
    } catch {
      parsed = undefined
    }
    if (!Array.isArray(parsed)) {
      errors.push('params: not a valid JSON array')
    } else {
      parsed.forEach((entry, i) => {
        const param = parseParam(entry, i, errors)
        if (param) params.push(param)
      })
      const seen = new Set<string>()
      for (const p of params) {
        if (seen.has(p.name)) errors.push(`param "${p.name}": duplicate name`)
        seen.add(p.name)
      }
    }
  }

  const body = value.body
  if (typeof body !== 'string' || body.length === 0 || body.length > MAX_BODY_LENGTH) {
    errors.push(`body: required, 1–${MAX_BODY_LENGTH} chars`)
  } else {
    if (!/\bvoid\s+main\s*\(/.test(body)) errors.push('body: must contain void main')
    if (!/\bgl_FragColor\b/.test(body)) errors.push('body: must write gl_FragColor')
    if (/\buniform\b/.test(body)) {
      errors.push('body: must not declare uniforms (declarations are generated from params)')
    }
    for (const token of RESERVED_TOKENS) {
      if (body.includes(token)) errors.push(`body: reserved token ${token}`)
    }
  }

  const animatedBy = value.animatedBy
  if (animatedBy !== undefined) {
    const gate = params.find((p) => p.name === animatedBy)
    if (!gate || gate.type !== 'range') {
      errors.push('animatedBy: must name a declared range param')
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    def: {
      name: name as string,
      ...(typeof description === 'string' && description.length > 0 ? { description } : {}),
      env: ENV_VERSION,
      params,
      body: body as string,
      ...(typeof animatedBy === 'string' ? { animatedBy } : {}),
    },
  }
}

export function buildEffectRecord(def: EffectDefinition, createdAt: string): EffectRecordWire {
  return {
    $type: 'com.luminframe.effect',
    name: def.name,
    ...(def.description ? { description: def.description } : {}),
    env: def.env,
    params: JSON.stringify(def.params),
    body: def.body,
    ...(def.animatedBy ? { animatedBy: def.animatedBy } : {}),
    createdAt,
  }
}
