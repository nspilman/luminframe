import { frameDelayCentiseconds } from './encodeGif'

// GIF delays are centiseconds, not milliseconds — the bug class is emitting ms
// (100× too slow) or a sub-2cs value that players animate inconsistently.
describe('frameDelayCentiseconds', () => {
  it('converts fps to centiseconds', () => {
    // 15 fps → 100/15 = 6.67 → 7cs per frame
    expect(frameDelayCentiseconds(15)).toBe(7)
  })

  it('clamps very high fps to the 2cs floor', () => {
    // 100/100 = 1cs, below the floor players honor reliably
    expect(frameDelayCentiseconds(100)).toBe(2)
  })
})
