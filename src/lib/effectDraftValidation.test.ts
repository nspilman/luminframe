import { validateDraftDef, bodyLinesFromCompileLog } from './effectDraftValidation'
import { EffectDefinition } from '@/effects-contract'

const validDef: EffectDefinition = {
  name: 'Invert',
  env: 1,
  params: [{ type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 }],
  body: 'void main() { gl_FragColor = vec4(1.0 - texture2D(imageTexture, vUv).rgb * amount, 1.0); }',
}

describe('validateDraftDef', () => {
  it('a sound draft → effect, no errors', () => {
    const result = validateDraftDef(validDef, () => ({ status: 'ok' }))
    expect(result.grammarErrors).toEqual([])
    expect(result.effect?.name).toBe('Invert')
  })

  it('grammar violations → all reported, compiler never consulted', () => {
    const compile = jest.fn()
    const result = validateDraftDef({ ...validDef, name: '', body: 'void main() { }' }, compile)
    expect(result.grammarErrors.length).toBeGreaterThan(1)
    expect(result.compile).toBeNull()
    expect(compile).not.toHaveBeenCalled()
  })

  it('compile failure → no effect, log carried', () => {
    const result = validateDraftDef(validDef, () => ({ status: 'failed', log: 'ERROR: 0:9: boom' }))
    expect(result.effect).toBeNull()
    expect(result.compile).toEqual({ status: 'failed', log: 'ERROR: 0:9: boom' })
  })

  it('compile unavailable counts as a pass', () => {
    // Pins the degrade path: no WebGL (jsdom/CI) must not report a broken draft.
    const result = validateDraftDef(validDef, () => ({ status: 'unavailable' }))
    expect(result.effect).not.toBeNull()
  })
})

describe('bodyLinesFromCompileLog', () => {
  // A draft with K declarationVars compiles with 5 + K lines before the body:
  // precision, vUv, time, prevFrame, K uniforms, lfFragColor. K = 4 here
  // (imageTexture + amount + resolution + opacity), so offset = 9.
  const K = 4

  it('maps an assembled line back into the body', () => {
    // Assembled line 12 − 9 = body line 3.
    expect(bodyLinesFromCompileLog("ERROR: 0:12: 'x' : undeclared identifier", K)).toEqual([
      { bodyLine: 3, message: "'x' : undeclared identifier" },
    ])
  })

  it('a preamble-line error keeps a null location', () => {
    // Assembled line 5 is a generated uniform declaration, not the author's text.
    expect(bodyLinesFromCompileLog('ERROR: 0:5: syntax error', K)[0].bodyLine).toBeNull()
  })

  it('collects every ERROR line and ignores the rest', () => {
    const log = "WARNING: 0:2: extension\nERROR: 0:10: first\nERROR: 0:11: second"
    expect(bodyLinesFromCompileLog(log, K).map((e) => e.message)).toEqual(['first', 'second'])
  })
})
