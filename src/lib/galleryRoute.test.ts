import { tabFromPath, pathForTab, isGalleryPath } from './galleryRoute'

describe('tabFromPath', () => {
  it('/gallery/mine → mine', () => {
    expect(tabFromPath('/gallery/mine')).toBe('mine')
  })

  it('trailing slash still resolves mine', () => {
    expect(tabFromPath('/gallery/mine/')).toBe('mine')
  })

  it('/gallery → network', () => {
    expect(tabFromPath('/gallery')).toBe('network')
  })

  it('/gallery/network → network', () => {
    // Any non-/mine gallery path is network, so an explicit /network reads the same.
    expect(tabFromPath('/gallery/network')).toBe('network')
  })
})

describe('pathForTab', () => {
  it('mine → /gallery/mine', () => {
    expect(pathForTab('mine')).toBe('/gallery/mine')
  })

  it('network → /gallery (bare, its canonical home)', () => {
    expect(pathForTab('network')).toBe('/gallery')
  })
})

describe('isGalleryPath', () => {
  it('true for /gallery', () => {
    expect(isGalleryPath('/gallery')).toBe(true)
  })

  it('true for a gallery sub-path', () => {
    expect(isGalleryPath('/gallery/mine')).toBe(true)
  })

  it('false for the editor root', () => {
    // The check must not treat '/' as a gallery path, or the editor would hide.
    expect(isGalleryPath('/')).toBe(false)
  })

  it('does not match a path that merely starts with the word gallery', () => {
    expect(isGalleryPath('/gallery-of-fame')).toBe(false)
  })
})
