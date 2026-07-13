import { evenDimension } from './encodeMp4'

// H.264 rejects odd frame dimensions (4:2:0 chroma). The bug class is passing an
// odd capture straight through, or flooring a small side to zero.
describe('evenDimension', () => {
  it('rounds an odd dimension down to even', () => {
    // 481 → 480, cropping the stray column H.264 can't sample
    expect(evenDimension(481)).toBe(480)
  })

  it('leaves an even dimension unchanged', () => {
    expect(evenDimension(480)).toBe(480)
  })

  it('floors a sub-2px dimension to 2', () => {
    // floor(1/2)*2 = 0, which the encoder rejects — clamp to the 2px minimum
    expect(evenDimension(1)).toBe(2)
  })
})
