import { browserOnlyEffectKey, browserOnlySlug, missingImageSlots } from './publishability'
import { stillEffect, twoImageEffect } from './testEffects'
import { Image } from '@/domain/models/Image'
import { Dimensions } from '@/domain/value-objects/Dimensions'

describe('browserOnlyEffectKey', () => {
  it('all publishable keys → null', () => {
    expect(
      browserOnlyEffectKey(['vignette', 'at://did:plc:abc/com.luminframe.effect/glow'])
    ).toBeNull()
  })

  it('draft:// key → that key', () => {
    expect(browserOnlyEffectKey(['vignette', 'draft://my-glow'])).toBe('draft://my-glow')
  })

  it('local:// key → that key', () => {
    expect(browserOnlyEffectKey(['local://invert'])).toBe('local://invert')
  })
})

describe('browserOnlySlug', () => {
  it('strips the scheme', () => {
    expect(browserOnlySlug('draft://my-glow')).toBe('my-glow')
  })
})

describe('missingImageSlots', () => {
  const image = new Image('img-1', new Dimensions(4, 2), { url: 'blob:test' })

  it('empty declared slot → its label', () => {
    expect(missingImageSlots(twoImageEffect, {})).toEqual(['Second Image'])
  })

  it('filled slot → nothing', () => {
    expect(missingImageSlots(twoImageEffect, { imageTextureTwo: image })).toEqual([])
  })

  it('does not report the host-provided imageTexture', () => {
    // stillEffect declares only imageTexture; with no params at all it must
    // still report nothing — the pass input is the pipeline's to supply.
    expect(missingImageSlots(stillEffect, {})).toEqual([])
  })
})
