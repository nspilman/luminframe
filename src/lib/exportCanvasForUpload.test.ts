import { scaleToLongestSide } from './exportCanvasForUpload'

describe('scaleToLongestSide', () => {
  it('leaves dimensions untouched when already within the cap', () => {
    expect(scaleToLongestSide(1600, 900, 2048)).toEqual({ width: 1600, height: 900 })
  })

  it('does not upscale a small image to the cap', () => {
    expect(scaleToLongestSide(800, 600, 2048)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape image so its width hits the cap, preserving ratio', () => {
    // 4000x3000 (4:3), cap 2048 → ratio 2048/4000 = 0.512
    // height = round(3000 * 0.512) = round(1536) = 1536
    expect(scaleToLongestSide(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 })
  })

  it('scales a portrait image so its height hits the cap', () => {
    // 3000x4000, cap 2048 → ratio 0.512; width = round(3000*0.512) = 1536
    expect(scaleToLongestSide(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 })
  })
})
