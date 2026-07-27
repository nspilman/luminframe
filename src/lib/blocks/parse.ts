import { PARAM_NAME_PATTERN } from '@/effects-contract'
import { OP_CATALOG } from './catalog'
import {
  ArgRef,
  BLOCKS_SOURCE_VERSION,
  BlockValueType,
  KnobSpec,
  KnobValue,
  MAX_BLOCKS,
  OpInstance,
  OpSpec,
  ShaderSourceDoc,
} from './types'

/**
 * The trust boundary for a Blocks program — a record's `source` field, a
 * stored draft, or the room's own working copy. Collects ALL violations
 * rather than stopping at the first (the effect grammar's idiom), and it is
 * the only judge: compileBlocks assumes a doc this parser has passed.
 */

export type BlocksParseResult =
  | { ok: true; doc: ShaderSourceDoc }
  | { ok: false; errors: string[] }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isColorTriple = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

/** The names an author may not shadow with a tap. */
const RESERVED_TAP_NAMES = ['current', 'source']

function isArgRef(v: unknown): v is ArgRef {
  if (v === 'current' || v === 'source') return true
  return isRecord(v) && typeof v.tap === 'string' && Object.keys(v).length === 1
}

/** The type an ArgRef carries at a given row, or null when it doesn't resolve. */
function refType(
  ref: ArgRef,
  prevType: BlockValueType,
  taps: Map<string, BlockValueType>
): BlockValueType | null {
  if (ref === 'current') return prevType
  if (ref === 'source') return 'vec3'
  return taps.get(ref.tap) ?? null
}

function knobValueFits(value: KnobValue, spec: KnobSpec): boolean {
  switch (spec.kind) {
    case 'range':
      return typeof value === 'number' && Number.isFinite(value)
    case 'toggle':
      return typeof value === 'boolean'
    case 'color':
      return isColorTriple(value)
  }
}

/** Validate one row; push named errors, return the instance when clean. */
function parseOp(
  value: unknown,
  index: number,
  prevType: BlockValueType,
  taps: Map<string, BlockValueType>,
  catalog: Record<string, OpSpec>,
  errors: string[]
): OpInstance | null {
  const at = `row ${index + 1}`
  if (!isRecord(value)) {
    errors.push(`${at}: must be an object`)
    return null
  }
  const key = value.op
  if (typeof key !== 'string' || !(key in catalog)) {
    errors.push(`${at}: unknown block "${String(key)}"`)
    return null
  }
  const spec = catalog[key]
  const subject = `${at} (${spec.name})`
  let clean = true

  const args: Record<string, ArgRef> = {}
  if (value.args !== undefined) {
    if (!isRecord(value.args)) {
      errors.push(`${subject}: args must be an object`)
      clean = false
    } else {
      for (const [name, ref] of Object.entries(value.args)) {
        const argSpec = spec.args[name]
        if (!argSpec) {
          errors.push(`${subject}: has no input named "${name}"`)
          clean = false
          continue
        }
        if (!isArgRef(ref)) {
          errors.push(`${subject}: input "${name}" must be "current", "source", or {tap}`)
          clean = false
          continue
        }
        const type = refType(ref, prevType, taps)
        if (type === null) {
          errors.push(`${subject}: input "${name}" references an unknown tap "${(ref as { tap: string }).tap}" — taps must be named on an earlier row`)
          clean = false
          continue
        }
        if (type !== argSpec.type) {
          errors.push(`${subject}: input "${name}" needs a ${argSpec.type} but gets a ${type}`)
          clean = false
          continue
        }
        args[name] = ref
      }
    }
  }
  // Every non-optional arg must resolve: wired, or the spec's default.
  for (const [name, argSpec] of Object.entries(spec.args)) {
    if (args[name] || argSpec.optional) continue
    if (!argSpec.default) {
      errors.push(`${subject}: input "${name}" needs a connection`)
      clean = false
      continue
    }
    const type = refType(argSpec.default, prevType, taps)
    if (type !== argSpec.type) {
      errors.push(`${subject}: input "${name}" needs a ${argSpec.type} but gets a ${type ?? 'nothing'}`)
      clean = false
    }
  }

  const knobs: Record<string, KnobValue> = {}
  if (value.knobs !== undefined) {
    if (!isRecord(value.knobs)) {
      errors.push(`${subject}: knobs must be an object`)
      clean = false
    } else {
      for (const [name, knobValue] of Object.entries(value.knobs)) {
        const knobSpec = spec.knobs[name]
        if (!knobSpec) {
          errors.push(`${subject}: has no knob named "${name}"`)
          clean = false
          continue
        }
        if (!knobValueFits(knobValue as KnobValue, knobSpec)) {
          errors.push(`${subject}: knob "${name}" has the wrong shape for a ${knobSpec.kind}`)
          clean = false
          continue
        }
        knobs[name] = knobValue as KnobValue
      }
    }
  }

  const exposed: string[] = []
  if (value.exposed !== undefined) {
    if (!Array.isArray(value.exposed) || !value.exposed.every((e) => typeof e === 'string')) {
      errors.push(`${subject}: exposed must be a list of knob names`)
      clean = false
    } else {
      for (const name of value.exposed) {
        if (!(name in spec.knobs)) {
          errors.push(`${subject}: can't expose unknown knob "${name}"`)
          clean = false
          continue
        }
        exposed.push(name)
      }
    }
  }

  let tap: string | undefined
  if (value.tap !== undefined) {
    if (
      typeof value.tap !== 'string' ||
      !PARAM_NAME_PATTERN.test(value.tap) ||
      RESERVED_TAP_NAMES.includes(value.tap)
    ) {
      errors.push(`${at}: tap name must be a plain identifier (and not "current" or "source")`)
      clean = false
    } else if (taps.has(value.tap)) {
      errors.push(`${at}: tap "${value.tap}" is already named on an earlier row`)
      clean = false
    } else {
      tap = value.tap
    }
  }

  if (!clean) return null
  return {
    op: key,
    ...(Object.keys(args).length > 0 ? { args } : {}),
    ...(Object.keys(knobs).length > 0 ? { knobs } : {}),
    ...(exposed.length > 0 ? { exposed } : {}),
    ...(tap ? { tap } : {}),
  }
}

export function parseShaderSource(
  value: unknown,
  catalog: Record<string, OpSpec> = OP_CATALOG
): BlocksParseResult {
  const errors: string[] = []
  if (!isRecord(value)) {
    return { ok: false, errors: ['source: must be an object'] }
  }
  if (value.version !== BLOCKS_SOURCE_VERSION) {
    errors.push(`source: unsupported version (this build speaks version ${BLOCKS_SOURCE_VERSION})`)
  }
  if (!Array.isArray(value.ops) || value.ops.length === 0 || value.ops.length > MAX_BLOCKS) {
    errors.push(`source: needs 1–${MAX_BLOCKS} blocks`)
    return { ok: false, errors }
  }

  const ops: OpInstance[] = []
  const taps = new Map<string, BlockValueType>()
  // Before the first row, "current" is the photo itself.
  let prevType: BlockValueType = 'vec3'
  value.ops.forEach((entry, i) => {
    const op = parseOp(entry, i, prevType, taps, catalog, errors)
    if (op) {
      ops.push(op)
      prevType = catalog[op.op].out
      if (op.tap) taps.set(op.tap, prevType)
    }
  })

  if (ops.length === value.ops.length && prevType !== 'vec3') {
    errors.push('the last block must produce a color — end with something that makes one (sample, mix, tint…)')
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, doc: { version: 1, ops } }
}
