import { buildEffectRecord, parseEffectRecord } from '@/effects-contract'
import { OP_CATALOG } from './catalog'
import { compileBlocks } from './compile'
import { parseShaderSource } from './parse'
import { OpInstance, ShaderSourceDoc } from './types'

/**
 * The Blocks grammar + compiler contract. The keystone: every op the catalog
 * ever grows must compile into a body the effect grammar accepts — Blocks
 * can't emit anything the record pipeline would refuse.
 */

/** The canonical branching program: a luminance mask driving a mix. */
const maskMix: ShaderSourceDoc = {
  version: 1,
  ops: [
    { op: 'sample', tap: 'base' },
    { op: 'luminance', tap: 'mask' },
    { op: 'mix', args: { a: 'source', b: { tap: 'base' }, t: { tap: 'mask' } } },
  ],
}

const errorsOf = (value: unknown): string[] => {
  const result = parseShaderSource(value)
  if (result.ok) throw new Error('expected parse to fail')
  return result.errors
}

describe('parseShaderSource', () => {
  it('round-trips the mask-mix program', () => {
    expect(parseShaderSource(maskMix)).toEqual({ ok: true, doc: maskMix })
  })

  it('non-object → source error', () => {
    expect(parseShaderSource('nope')).toEqual({ ok: false, errors: ['source: must be an object'] })
  })

  it('unknown block → row error', () => {
    expect(errorsOf({ version: 1, ops: [{ op: 'ghost' }] })).toContain('row 1: unknown block "ghost"')
  })

  it('a tap referenced before its row → unknown-tap error', () => {
    const doc = {
      version: 1,
      ops: [
        { op: 'mix', args: { t: { tap: 'mask' } } },
        { op: 'luminance', tap: 'mask' },
      ],
    }
    expect(errorsOf(doc)).toContain(
      'row 1 (Mix): input "t" references an unknown tap "mask" — taps must be named on an earlier row'
    )
  })

  it('duplicate tap names → tap error', () => {
    const doc = {
      version: 1,
      ops: [
        { op: 'sample', tap: 'base' },
        { op: 'sample', tap: 'base' },
      ],
    }
    expect(errorsOf(doc)).toContain('row 2: tap "base" is already named on an earlier row')
  })

  it('a reserved tap name → tap error', () => {
    expect(errorsOf({ version: 1, ops: [{ op: 'sample', tap: 'source' }] })).toContain(
      'row 1: tap name must be a plain identifier (and not "current" or "source")'
    )
  })

  it('wiring the wrong type → mismatch naming both types', () => {
    const doc = {
      version: 1,
      ops: [
        { op: 'sample', tap: 'base' },
        { op: 'mix', args: { t: { tap: 'base' } } },
      ],
    }
    expect(errorsOf(doc)).toContain('row 2 (Mix): input "t" needs a float but gets a vec3')
  })

  it('a default arg that no longer type-checks → mismatch on the default', () => {
    // After luminance, "current" is a float — mix's default b (current) can't take it.
    const doc = { version: 1, ops: [{ op: 'luminance' }, { op: 'mix' }] }
    expect(errorsOf(doc)).toContain('row 2 (Mix): input "b" needs a vec3 but gets a float')
  })

  it('a program ending on a non-color → last-block error', () => {
    expect(errorsOf({ version: 1, ops: [{ op: 'sample' }, { op: 'luminance' }] })).toContain(
      'the last block must produce a color — end with something that makes one (sample, mix, tint…)'
    )
  })

  it('exposing an unknown knob → exposure error', () => {
    expect(errorsOf({ version: 1, ops: [{ op: 'sample', exposed: ['ghost'] }] })).toContain(
      "row 1 (Sample): can't expose unknown knob \"ghost\""
    )
  })

  it('wrong version → version error', () => {
    expect(errorsOf({ version: 2, ops: [{ op: 'sample' }] })).toContain(
      'source: unsupported version (this build speaks version 1)'
    )
  })
})

describe('compileBlocks', () => {
  it('pins the mask-mix body', () => {
    expect(compileBlocks(maskMix).body).toMatchInlineSnapshot(`
"void main() {
  vec3 lf_source = texture2D(imageTexture, vUv).rgb;
  vec3 lf_v0 = texture2D(imageTexture, vUv).rgb;
  float lf_v1 = dot(lf_v0, vec3(0.299, 0.587, 0.114));
  vec3 lf_v2 = mix(lf_source, lf_v0, lf_v1);
  gl_FragColor = vec4(lf_v2, 1.0);
}"
`)
  })

  it('an exposed knob becomes a param defaulting to its authored value', () => {
    const doc: ShaderSourceDoc = {
      version: 1,
      ops: [{ op: 'mix', knobs: { amount: 0.25 }, exposed: ['amount'] }],
    }
    const { body, params } = compileBlocks(doc)
    expect(params).toEqual([
      { type: 'range', name: 'mix_amount', label: 'Mix Amount', default: 0.25, min: 0, max: 1, step: 0.01 },
    ])
    expect(body).toContain('mix_amount)')
  })

  it('a baked number knob reads as a GLSL float literal', () => {
    // `1` must emit as 1.0 — an int literal would fail mix()'s float overload.
    const doc: ShaderSourceDoc = { version: 1, ops: [{ op: 'mix', knobs: { amount: 1 } }] }
    expect(compileBlocks(doc).body).toContain('mix(lf_source, lf_source, 1.0)')
  })

  it('repeated exposures of the same op uniquify their param names', () => {
    const doc: ShaderSourceDoc = {
      version: 1,
      ops: [
        { op: 'mix', exposed: ['amount'], tap: 'a' },
        { op: 'mix', args: { b: { tap: 'a' } }, exposed: ['amount'] },
      ],
    }
    expect(compileBlocks(doc).params.map((p) => p.name)).toEqual(['mix_amount', 'mix_amount2'])
  })

  it('lineMap points each row at its own body line', () => {
    const { body, lineMap } = compileBlocks(maskMix)
    const lines = body.split('\n')
    for (const { row, line } of lineMap) {
      expect(lines[line - 1]).toContain(`lf_v${row} = `)
    }
  })

  it('pins the glitch program — noise displacing where the photo is read', () => {
    const glitch: ShaderSourceDoc = {
      version: 1,
      ops: [
        { op: 'noise', knobs: { scale: 3 }, tap: 'n' },
        { op: 'displace', args: { by: { tap: 'n' } }, knobs: { across: 0.1 } },
        { op: 'sample', args: { uv: 'current' } },
        { op: 'posterize', knobs: { levels: 5 } },
      ],
    }
    const parsed = parseShaderSource(glitch)
    expect(parsed.ok).toBe(true)
    const { body } = compileBlocks(glitch)
    expect(body).toMatchInlineSnapshot(`
"float lfbHash(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 lf_source = texture2D(imageTexture, vUv).rgb;
  float lf_v0 = lfbHash(floor((vUv) * 3.0));
  vec2 lf_v1 = vUv + (lf_v0 - 0.5) * vec2(0.1, 0.0);
  vec3 lf_v2 = texture2D(imageTexture, lf_v1).rgb;
  vec3 lf_v3 = floor(lf_v2 * 5.0) / 5.0;
  gl_FragColor = vec4(lf_v3, 1.0);
}"
`)
  })

  it('the duotone program parses and compiles clean', () => {
    const duotone: ShaderSourceDoc = {
      version: 1,
      ops: [
        { op: 'luminance' },
        { op: 'threshold', knobs: { softness: 0.3 }, exposed: ['center'] },
        { op: 'colorize' },
      ],
    }
    const parsed = parseShaderSource(duotone)
    expect(parsed.ok).toBe(true)
    const { params } = compileBlocks(duotone)
    expect(params.map((p) => p.name)).toEqual(['threshold_center'])
  })

  it('still noise never reads the clock', () => {
    // drift baked at 0 must not emit `time` — the host reads any time
    // reference as "this shader animates" and starts the rAF loop.
    const still: ShaderSourceDoc = { version: 1, ops: [{ op: 'noise' }, { op: 'colorize' }] }
    expect(compileBlocks(still).body).not.toMatch(/\btime\b/)
  })

  it('drifting (or exposed-drift) noise does read the clock', () => {
    const drifting: ShaderSourceDoc = {
      version: 1,
      ops: [{ op: 'noise', knobs: { drift: 0.5 } }, { op: 'colorize' }],
    }
    const exposed: ShaderSourceDoc = {
      version: 1,
      ops: [{ op: 'noise', exposed: ['drift'] }, { op: 'colorize' }],
    }
    expect(compileBlocks(drifting).body).toMatch(/\btime\b/)
    expect(compileBlocks(exposed).body).toMatch(/\btime\b/)
  })

  it('every catalog op compiles into a body the effect grammar accepts', () => {
    // The keystone: Blocks may never emit what the record pipeline refuses
    // (a `uniform` token, reserved names, a second main). Each op is compiled
    // twice — knobs baked and knobs exposed — and judged by parseEffectRecord.
    for (const spec of Object.values(OP_CATALOG)) {
      // Feed rows so any arg type is wireable: a color tap and a float tap.
      const prelude: OpInstance[] = [
        { op: 'sample', tap: 'c3' },
        { op: 'luminance', args: { in: { tap: 'c3' } }, tap: 'f1' },
      ]
      // Wire every required arg explicitly — a spec default like "current"
      // may not type-check after the prelude, and defaults aren't the subject
      // here. (A future op with a required vec2 arg fails loudly: extend the
      // prelude with a vec2 producer then.)
      const args = Object.fromEntries(
        Object.entries(spec.args).flatMap(([name, a]) => {
          if (a.optional) return []
          return [[name, a.type === 'float' ? { tap: 'f1' } : { tap: 'c3' }]]
        })
      )
      for (const exposed of [[], Object.keys(spec.knobs)]) {
        const ops: OpInstance[] = [
          ...prelude,
          { op: spec.key, ...(Object.keys(args).length ? { args } : {}), exposed },
        ]
        if (spec.out !== 'vec3') ops.push({ op: 'sample' })
        const parsed = parseShaderSource({ version: 1, ops })
        if (!parsed.ok) throw new Error(`${spec.key}: ${parsed.errors.join('; ')}`)
        const { body, params } = compileBlocks(parsed.doc)
        const record = buildEffectRecord(
          { name: spec.name, env: 1, params, body },
          '2026-07-27T00:00:00.000Z'
        )
        const judged = parseEffectRecord(record)
        if (!judged.ok) throw new Error(`${spec.key} emits an invalid body: ${judged.errors.join('; ')}`)
      }
    }
  })
})
