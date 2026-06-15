import { appendAttribution } from './blueskyAttribution'

describe('appendAttribution', () => {
  it('appends the attribution after a caption, separated by a blank line', () => {
    const { text } = appendAttribution('a misty forest')
    expect(text).toBe('a misty forest\n\nmade in the Atmosphere in luminframe.com')
  })

  it('uses no separator when the caption is empty', () => {
    const { text } = appendAttribution('')
    expect(text).toBe('made in the Atmosphere in luminframe.com')
  })

  it('links luminframe.com with a #link feature', () => {
    const { facet } = appendAttribution('')
    expect(facet.features).toEqual([
      { $type: 'app.bsky.richtext.facet#link', uri: 'https://luminframe.com' },
    ])
  })

  it('points the facet at the luminframe.com bytes in an empty-caption post', () => {
    // text = "made in the Atmosphere in luminframe.com"
    // "made in the Atmosphere in " is 26 ASCII bytes → label starts at 26
    const { facet } = appendAttribution('')
    expect(facet.index).toEqual({ byteStart: 26, byteEnd: 40 })
  })

  it('computes byte offsets past a multi-byte caption, not char indices', () => {
    // caption "📸" is 1 JS code point but 4 UTF-8 bytes; separator "\n\n" = 2 bytes;
    // "made in the Atmosphere in " = 26 bytes → label starts at 4 + 2 + 26 = 32
    const { facet } = appendAttribution('📸')
    expect(facet.index).toEqual({ byteStart: 32, byteEnd: 46 })
  })
})
