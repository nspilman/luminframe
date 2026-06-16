import { serializeValue, deserializeValue } from './editorSession'
import { Image } from '@/domain/models/Image'
import { Color } from '@/domain/value-objects/Color'
import { Dimensions } from '@/domain/value-objects/Dimensions'

const noImages = new Map<string, Image>()

describe('serializeValue / deserializeValue', () => {
  it('round-trips a number', () => {
    expect(deserializeValue(serializeValue(0.5), noImages)).toBe(0.5)
  })

  it('round-trips a boolean', () => {
    expect(deserializeValue(serializeValue(true), noImages)).toBe(true)
  })

  it('round-trips null', () => {
    expect(deserializeValue(serializeValue(null), noImages)).toBeNull()
  })

  it('round-trips a number array', () => {
    expect(deserializeValue(serializeValue([1, 2]), noImages)).toEqual([1, 2])
  })

  it('round-trips a Float32Array as a Float32Array, not a plain array', () => {
    const restored = deserializeValue(serializeValue(new Float32Array([0.1, 0.2, 0.3])), noImages)
    expect(restored).toBeInstanceOf(Float32Array)
    expect(Array.from(restored as Float32Array)).toEqual([
      new Float32Array([0.1])[0],
      new Float32Array([0.2])[0],
      new Float32Array([0.3])[0],
    ])
  })

  it('round-trips a Color through its channels', () => {
    const restored = deserializeValue(serializeValue(Color.fromHex('#3366ff')), noImages)
    expect(restored).toBeInstanceOf(Color)
    expect((restored as Color).toHex()).toBe('#3366ff')
  })

  it('serializes an Image to an id reference', () => {
    const image = new Image('img-7', new Dimensions(4, 2), { url: 'blob:x' })
    expect(serializeValue(image)).toEqual({ t: 'imageRef', id: 'img-7' })
  })

  it('resolves an image reference back to the rebuilt image', () => {
    const rebuilt = new Image('img-7', new Dimensions(4, 2), { url: 'data:image/png;base64,AAAA' })
    const resolved = deserializeValue({ t: 'imageRef', id: 'img-7' }, new Map([['img-7', rebuilt]]))
    expect(resolved).toBe(rebuilt)
  })

  it('resolves a dangling image reference to null', () => {
    expect(deserializeValue({ t: 'imageRef', id: 'missing' }, noImages)).toBeNull()
  })
})
