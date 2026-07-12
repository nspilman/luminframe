import { serializeParamValue, serializeRecipe } from './serializeRecipe'
import { Color } from '@/domain/value-objects/Color'
import { Image } from '@/domain/models/Image'

describe('serializeParamValue', () => {
  it('keeps numbers, strings, and booleans as-is', () => {
    expect(serializeParamValue(0.4)).toBe(0.4)
    expect(serializeParamValue('warm')).toBe('warm')
    expect(serializeParamValue(true)).toBe(true)
  })

  it('serializes a Color to hex', () => {
    expect(serializeParamValue(Color.fromRGB(1, 0, 0))).toBe('#ff0000')
  })

  it('converts a Float32Array to a plain number array', () => {
    // Values chosen to be exactly representable in float32 so the round-trip is
    // lossless — the point is the Float32Array → number[] conversion, not precision.
    expect(serializeParamValue(new Float32Array([0.5, 0.25, 0.75]))).toEqual([
      0.5, 0.25, 0.75,
    ])
  })

  it('keeps a numeric array (e.g. a vec3)', () => {
    expect(serializeParamValue([0.5, 0.5, 0.5])).toEqual([0.5, 0.5, 0.5])
  })

  it('drops an Image — the source photo is never recipe data', () => {
    const img = Object.create(Image.prototype)
    expect(serializeParamValue(img)).toBeUndefined()
  })

  it('drops null', () => {
    expect(serializeParamValue(null)).toBeUndefined()
  })
})

describe('serializeRecipe', () => {
  it('flattens a stack, keeping serializable params per step', () => {
    const recipe = serializeRecipe([
      { type: 'vibrance', params: { amount: 0.4 } },
      { type: 'splitTone', params: { highlight: Color.fromRGB(1, 0, 0), shadow: Color.fromRGB(0, 0, 1) } },
    ])

    expect(recipe).toEqual([
      { type: 'vibrance', params: { amount: 0.4 } },
      { type: 'splitTone', params: { highlight: '#ff0000', shadow: '#0000ff' } },
    ])
  })

  it('emits a step with no params key when every param was dropped', () => {
    // An effect whose only param is the source image carries no recipe params —
    // the step is just its type, not `{ type, params: {} }`.
    const img = Object.create(Image.prototype)
    const recipe = serializeRecipe([{ type: 'blend', params: { imageTexture: img } }])

    expect(recipe).toEqual([{ type: 'blend' }])
  })
})
