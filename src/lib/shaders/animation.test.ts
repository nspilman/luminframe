import { passIsAnimated, chainIsAnimated, motionOf } from './animation'
import { animatedEffect, gatedEffect, stillEffect } from './testEffects'

// Fixtures built through the production factory, one per motion character —
// the library itself lives in canon now, so the pins are behavioral.
describe('passIsAnimated', () => {
  it('time-driven effect with no gate → animated', () => {
    expect(passIsAnimated(animatedEffect, {})).toBe(true)
  })

  it('static effect → still', () => {
    expect(passIsAnimated(stillEffect, {})).toBe(false)
  })

  it('gated effect at zero → still', () => {
    // The bug class: Light Leak's body mentions `time`, but at drift 0 every
    // frame is identical — exporting an MP4 of frozen frames surprised users.
    expect(passIsAnimated(gatedEffect, { drift: 0 })).toBe(false)
  })

  it('gated effect above zero → animated', () => {
    expect(passIsAnimated(gatedEffect, { drift: 0.5 })).toBe(true)
  })

  it('gated effect with the param omitted falls back to its default (still)', () => {
    // Old recipes and drafts predate `drift`; they hydrate without it and must
    // stay still, matching the new default rather than silently animating.
    expect(passIsAnimated(gatedEffect, {})).toBe(false)
  })

  it('gate declared but param missing everywhere → still', () => {
    const effect = {
      getBody: () => 'void main() { float x = time; }',
      animatedBy: 'ghost',
      defaultValues: {},
    }
    expect(passIsAnimated(effect, {})).toBe(false)
  })

  it('does not let a gate quiet a feedback effect', () => {
    // Deliberate: feedback accumulates state across frames no matter what its
    // parameters read, so animatedBy applies to time-driven motion only. This
    // pins the check order — moving the gate above prevFrame would break it.
    const effect = {
      getBody: () => 'void main() { vec4 p = texture2D(prevFrame, vUv); }',
      animatedBy: 'speed',
      defaultValues: { speed: 0 },
    }
    expect(passIsAnimated(effect, { speed: 0 })).toBe(true)
  })
})

// The motion badge in the library derives from motionOf; these pin the three
// characters against real effects so the badge can't drift from the export.
describe('motionOf', () => {
  it('time-driven effect → animated', () => {
    expect(motionOf(animatedEffect)).toBe('animated')
  })

  it('gated effect that defaults still → gated', () => {
    expect(motionOf(gatedEffect)).toBe('gated')
  })

  it('static effect → still', () => {
    expect(motionOf(stillEffect)).toBe('still')
  })
})

describe('chainIsAnimated', () => {
  it('chain with one animated pass → animated', () => {
    expect(
      chainIsAnimated([
        { effect: stillEffect, params: {} },
        { effect: animatedEffect, params: {} },
      ])
    ).toBe(true)
  })

  it('chain of stills (including a gated effect at zero) → still', () => {
    expect(
      chainIsAnimated([
        { effect: stillEffect, params: {} },
        { effect: gatedEffect, params: { drift: 0 } },
      ])
    ).toBe(false)
  })
})
