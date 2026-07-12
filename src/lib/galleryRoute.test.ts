import {
  tabFromPath,
  pathForTab,
  isGalleryPath,
  editorRemixPath,
  imagePagePath,
  parseImagePath,
  isImagePath,
} from './galleryRoute'

describe('imagePagePath / parseImagePath', () => {
  it('builds an image-page path with did and rkey encoded', () => {
    // The DID's colons must be encoded or they'd read as extra path structure.
    expect(imagePagePath('did:plc:abc', '3kxyz')).toBe('/image/did%3Aplc%3Aabc/3kxyz')
  })

  it('round-trips a path back to its did and rkey', () => {
    const path = imagePagePath('did:plc:abc', '3kxyz')
    expect(parseImagePath(path)).toEqual({ did: 'did:plc:abc', rkey: '3kxyz' })
  })

  it('returns null for a non-image path', () => {
    expect(parseImagePath('/gallery/mine')).toBeNull()
  })

  it('returns null when the rkey segment is missing', () => {
    expect(parseImagePath('/image/did:plc:abc')).toBeNull()
  })
})

describe('isImagePath', () => {
  it('true for a full image path', () => {
    expect(isImagePath('/image/did%3Aplc%3Aabc/3kxyz')).toBe(true)
  })

  it('false for the gallery', () => {
    expect(isImagePath('/gallery')).toBe(false)
  })
})

describe('editorRemixPath', () => {
  it('builds an editor URL with the AT-URI encoded into ?remix', () => {
    // Encoding is load-bearing: an unencoded at:// URI's slashes would be read
    // as path segments and the remix link would point nowhere.
    expect(editorRemixPath('at://did:plc:abc/com.luminframe.image/xyz')).toBe(
      '/?remix=at%3A%2F%2Fdid%3Aplc%3Aabc%2Fcom.luminframe.image%2Fxyz'
    )
  })
})

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
