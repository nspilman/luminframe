import { containFit } from './containFit'

// containFit is the letterbox math: fit the whole image inside the container,
// aspect preserved, bound by whichever axis runs out first.
describe('containFit', () => {
  it('binds to width for a landscape image in a taller box', () => {
    // container 1000x1000, image 2:1 → scale = min(1000/200, 1000/100) = 5
    // 200*5=1000 fills width; 100*5=500 leaves gutter above/below.
    expect(containFit(1000, 1000, 200, 100)).toEqual({ width: 1000, height: 500 })
  })

  it('binds to height for a portrait image in a wider box', () => {
    // container 1000x1000, image 1:2 → scale = min(1000/100, 1000/200) = 5
    // 200*5=1000 fills height; 100*5=500 leaves gutter left/right.
    expect(containFit(1000, 1000, 100, 200)).toEqual({ width: 500, height: 1000 })
  })

  it('scales a small image up to fill the viewport (fit-to-window)', () => {
    // A source smaller than the container is enlarged, not pinned at 1:1.
    // container 800x800, image 100x100 → scale 8 → 800x800.
    expect(containFit(800, 800, 100, 100)).toEqual({ width: 800, height: 800 })
  })

  it('returns zero size when the container has not been laid out', () => {
    // A 0-sized container must not divide by zero or size a canvas to nothing.
    expect(containFit(0, 500, 300, 200)).toEqual({ width: 0, height: 0 })
  })
})
