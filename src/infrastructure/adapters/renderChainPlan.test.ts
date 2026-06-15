import { planPasses } from './renderChainPlan'

describe('planPasses', () => {
  // A single live effect on the source: no framebuffers, straight to the canvas.
  it('sends a one-pass chain straight to the canvas', () => {
    expect(planPasses(1)).toEqual([{ input: 'source', output: 'canvas' }])
  })

  // The bug this guards: the second pass must read what the first pass produced,
  // not the original source. First writes slot 1, second reads slot 1.
  it('feeds the first pass output into the second pass', () => {
    expect(planPasses(2)).toEqual([
      { input: 'source', output: 1 },
      { input: 1, output: 'canvas' },
    ])
  })

  // Three passes prove the ping-pong alternates rather than reusing one slot:
  // pass 2 reads slot 1 (what pass 1 wrote) and writes slot 0, so pass 3 reads
  // slot 0. A pass never reads and writes the same framebuffer.
  it('alternates framebuffers across three passes', () => {
    expect(planPasses(3)).toEqual([
      { input: 'source', output: 1 },
      { input: 1, output: 0 },
      { input: 0, output: 'canvas' },
    ])
  })

  it('plans nothing for an empty chain', () => {
    expect(planPasses(0)).toEqual([])
  })
})
