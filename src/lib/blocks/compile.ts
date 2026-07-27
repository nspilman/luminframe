import { EffectParamDef } from '@/effects-contract'
import { OP_CATALOG } from './catalog'
import { ArgRef, KnobSpec, KnobValue, OpSpec, ShaderSourceDoc } from './types'

/**
 * Blocks → one GLSL fragment body. Each row becomes a typed local
 * (lf_v0, lf_v1, …) in main; exposed knobs become published params (the
 * uniforms the host generates), baked knobs become literals. The emitted body
 * lives inside the effect grammar's rules — no `uniform` token, no reserved
 * names, `void main()` the only main — and the compiled def flows through the
 * exact validate → compile-gate → publish pipeline hand-written GLSL does.
 *
 * Precondition: the doc has passed parseShaderSource; this module doesn't
 * re-judge it.
 */

export interface CompiledBlocks {
  body: string
  params: EffectParamDef[]
  /** 1-based body line for each row, for mapping GPU errors back to blocks. */
  lineMap: Array<{ row: number; line: number }>
}

/** A number as a GLSL float literal — `1` must read `1.0` or the GPU sees an int. */
const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v))

const knobLiteral = (value: KnobValue): string => {
  if (typeof value === 'number') return f(value)
  if (typeof value === 'boolean') return String(value)
  return `vec3(${f(value[0])}, ${f(value[1])}, ${f(value[2])})`
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** The exposed knob as a published param, defaulting to its authored value. */
function paramFor(name: string, label: string, spec: KnobSpec, value: KnobValue): EffectParamDef {
  switch (spec.kind) {
    case 'range':
      return {
        type: 'range',
        name,
        label,
        default: clamp(typeof value === 'number' ? value : spec.default, spec.min, spec.max),
        min: spec.min,
        max: spec.max,
        step: spec.step,
      }
    case 'toggle':
      return { type: 'boolean', name, label, default: typeof value === 'boolean' ? value : spec.default }
    case 'color': {
      const rgb = Array.isArray(value) ? value : spec.default
      return {
        type: 'color',
        name,
        label,
        default: [clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1)],
      }
    }
  }
}

export function compileBlocks(
  doc: ShaderSourceDoc,
  catalog: Record<string, OpSpec> = OP_CATALOG
): CompiledBlocks {
  const params: EffectParamDef[] = []
  const usedParamNames = new Set<string>()
  const helpers: string[] = []
  const tapRows = new Map<string, number>()

  const resolveRef = (ref: ArgRef, row: number): string => {
    if (ref === 'source') return 'lf_source'
    if (ref === 'current') return row === 0 ? 'lf_source' : `lf_v${row - 1}`
    return `lf_v${tapRows.get(ref.tap)}`
  }

  const rowLines = doc.ops.map((op, row) => {
    const spec = catalog[op.op]
    for (const helper of spec.helpers ?? []) {
      if (!helpers.includes(helper)) helpers.push(helper)
    }
    const knobExpr = (name: string): string => {
      const knobSpec = spec.knobs[name]
      const value = op.knobs?.[name] ?? knobSpec.default
      if (!op.exposed?.includes(name)) return knobLiteral(value)
      let paramName = `${spec.key}_${name}`
      let n = 2
      while (usedParamNames.has(paramName)) paramName = `${spec.key}_${name}${n++}`
      usedParamNames.add(paramName)
      params.push(paramFor(paramName, `${spec.name} ${knobSpec.label}`, knobSpec, value))
      return paramName
    }
    const expr = spec.emit({
      arg: (name) => {
        const ref = op.args?.[name] ?? spec.args[name].default
        return ref ? resolveRef(ref, row) : null
      },
      knob: knobExpr,
    })
    if (op.tap) tapRows.set(op.tap, row)
    return `  ${spec.out} lf_v${row} = ${expr};`
  })

  const last = doc.ops.length - 1
  const lines = [
    ...helpers.flatMap((h) => [...h.split('\n'), '']),
    'void main() {',
    '  vec3 lf_source = texture2D(imageTexture, vUv).rgb;',
    ...rowLines,
    `  gl_FragColor = vec4(lf_v${last}, 1.0);`,
    '}',
  ]

  // Row i's line: helpers (+ blank each), the main line, the source line, then rows.
  const helperLineCount = helpers.reduce((n, h) => n + h.split('\n').length + 1, 0)
  const lineMap = doc.ops.map((_, row) => ({ row, line: helperLineCount + 3 + row }))

  return { body: lines.join('\n'), params, lineMap }
}
