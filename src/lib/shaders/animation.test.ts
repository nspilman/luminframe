import { passIsAnimated, chainIsAnimated } from './animation'
import { shaderLibrary } from '@/lib/shaders'

// The real library is used throughout so these double as contract pins — e.g.
// lightLeak's animatedBy must name a parameter that actually exists.
describe('passIsAnimated', () => {
  it('time-driven effect with no gate → animated', () => {
    expect(passIsAnimated(shaderLibrary.wave, {})).toBe(true)
  })

  it('static effect → still', () => {
    expect(passIsAnimated(shaderLibrary.blackAndWhite, {})).toBe(false)
  })

  it('gated effect at zero → still', () => {
    // The bug class: Light Leak's body mentions `time`, but at drift 0 every
    // frame is identical — exporting an MP4 of frozen frames surprised users.
    expect(passIsAnimated(shaderLibrary.lightLeak, { drift: 0 })).toBe(false)
  })

  it('gated effect above zero → animated', () => {
    expect(passIsAnimated(shaderLibrary.lightLeak, { drift: 0.5 })).toBe(true)
  })

  it('gated effect with the param omitted falls back to its default (still)', () => {
    // Old recipes and drafts predate `drift`; they hydrate without it and must
    // stay still, matching the new default rather than silently animating.
    expect(passIsAnimated(shaderLibrary.lightLeak, {})).toBe(false)
  })

  it('gate declared but param missing everywhere → still', () => {
    const effect = {
      getBody: () => 'void main() { float x = time; }',
      animatedBy: 'ghost',
      defaultValues: {},
    }
    expect(passIsAnimated(effect, {})).toBe(false)
  })
})

describe('chainIsAnimated', () => {
  it('chain with one animated pass → animated', () => {
    expect(
      chainIsAnimated([
        { effect: shaderLibrary.blackAndWhite, params: {} },
        { effect: shaderLibrary.wave, params: {} },
      ])
    ).toBe(true)
  })

  it('chain of stills (including a gated effect at zero) → still', () => {
    expect(
      chainIsAnimated([
        { effect: shaderLibrary.blackAndWhite, params: {} },
        { effect: shaderLibrary.lightLeak, params: { drift: 0 } },
      ])
    ).toBe(false)
  })
})
