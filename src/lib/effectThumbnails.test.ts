import { thumbnailDimensions } from './effectThumbnails'
import { Dimensions } from '@/domain/value-objects/Dimensions'

describe('thumbnailDimensions', () => {
  it('caps the long edge of a landscape source at maxEdge', () => {
    // 800x600, maxEdge 96: factor 96/800 = 0.12 → 96 x round(600*0.12)=72
    const d = thumbnailDimensions(new Dimensions(800, 600), 96)
    expect(d.toArray()).toEqual([96, 72])
  })

  it('caps the long edge of a portrait source at maxEdge', () => {
    // 600x800, maxEdge 96: factor 96/800 = 0.12 → round(600*0.12)=72 x 96
    const d = thumbnailDimensions(new Dimensions(600, 800), 96)
    expect(d.toArray()).toEqual([72, 96])
  })

  it('clamps the short edge to 1 for an extreme aspect ratio', () => {
    // 2000x10, maxEdge 96: factor 0.048 → short edge 10*0.048=0.48 rounds to 0,
    // clamped to 1 so the result is still a valid Dimensions.
    const d = thumbnailDimensions(new Dimensions(2000, 10), 96)
    expect(d.toArray()).toEqual([96, 1])
  })
})
