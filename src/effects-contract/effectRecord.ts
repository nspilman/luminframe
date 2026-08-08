import {
  ENV_VERSION,
  MAX_BODY_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PARAMS_JSON_LENGTH,
  MAX_TEXTURE_PARAMS,
  PARAM_NAME_PATTERN,
  RESERVED_TOKENS,
  RESERVED_UNIFORMS,
} from './constants'
import { EffectDefinition, EffectParamDef, EffectRecordWire } from './types'
import { isFiniteNumber, isRecord } from './predicates'

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
    case 'vec2': {
      if (!isNumberPair(value.default)) {
        errors.push(`${subject}: default must be [x, y] finite numbers`)
        return null
      }
      const { min, max, step, labels } = value
      const bounds = [min, max, step]
      if (bounds.every((b) => b === undefined)) {
        return { type: 'vec2', ...base, default: value.default }
      }
      // Bounds travel together: a track needs all three to mean anything.
      if (!bounds.every(isNumberPair)) {
        errors.push(`${subject}: min, max, step must all be [x, y] pairs when bounds are declared`)
        return null
      }
      const axisLabels =
        Array.isArray(labels) && labels.length === 2 && labels.every((l) => typeof l === 'string')
          ? { labels: labels as [string, string] }
          : {}
      return {
        type: 'vec2',
        ...base,
        default: value.default,
        min: min as [number, number],
        max: max as [number, number],
        step: step as [number, number],
        ...axisLabels,
      }
    }
    case 'image':
      return { type: 'image', ...base }
    case 'text': {
      if (typeof value.default !== 'string') {
        errors.push(`${subject}: default must be a string`)
        return null
      }
      const placeholder =
        typeof value.placeholder === 'string' ? { placeholder: value.placeholder } : {}
      return { type: 'text', ...base, default: value.default, ...placeholder }
    }
    default:
      errors.push(`${subject}: unknown type (must be range, color, boolean, vec2, image, or text)`)
      return null
  }
}

/**
 * The smallest env a param set can honestly declare. Image and text params,
 * and vec2 bounds, are env-2 vocabulary; everything else parses under env 1.
 * The publish paths stamp records with this rather than ENV_VERSION so a
 * plain-knob effect stays readable by every env-1 client already deployed,
 * and parseEffectRecord enforces it so a record's env claim can't lie.
 */
export function minimalEnvFor(params: readonly EffectParamDef[]): 1 | 2 {
  const needsEnv2 = params.some(
    (p) => p.type === 'image' || p.type === 'text' || (p.type === 'vec2' && p.min !== undefined)
  )
  return needsEnv2 ? 2 : 1
}

/**
 * Judge a params JSON string alone — the same grammar parseEffectRecord
 * applies to a record's params field, exposed for surfaces that edit params
 * as raw JSON. Length is the caller's concern (parseEffectRecord enforces it
 * for records).
 */
export function parseParamsJson(json: string): { params: EffectParamDef[]; errors: string[] } {
  const errors: string[] = []
  const params: EffectParamDef[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
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
    const textureParams = params.filter((p) => p.type === 'image' || p.type === 'text').length
    if (textureParams > MAX_TEXTURE_PARAMS) {
      errors.push(
        `params: at most ${MAX_TEXTURE_PARAMS} image/text params (WebGL1 guarantees only 8 texture units and the host uses 2)`
      )
    }
  }
  return { params, errors }
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

  const env = value.env
  const envValid = typeof env === 'number' && Number.isInteger(env) && env >= 1 && env <= ENV_VERSION
  if (!envValid) {
    errors.push(`env: unsupported version (this client speaks env 1 through ${ENV_VERSION})`)
  }

  const params: EffectParamDef[] = []
  if (typeof value.params !== 'string' || value.params.length > MAX_PARAMS_JSON_LENGTH) {
    errors.push(`params: must be a JSON string of at most ${MAX_PARAMS_JSON_LENGTH} chars`)
  } else {
    const judged = parseParamsJson(value.params)
    errors.push(...judged.errors)
    params.push(...judged.params)
  }

  // A record must declare at least the env its params require — an env-1
  // claim over env-2 params would read as valid here while every env-1
  // client rejects it on the param type. The claim must not lie.
  if (envValid && (env as number) < minimalEnvFor(params)) {
    errors.push(`env: params require env ${minimalEnvFor(params)} but the record claims env ${env}`)
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
      // The record's own claim, not this client's ceiling — a valid env-1
      // record stays env 1 through a parse → build round trip.
      env: env as number,
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
