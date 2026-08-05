import {
  escapeHtml,
  imagePageMeta,
  imageTargetFromUrl,
  metaTags,
  staticPageMeta,
  renderMetaTags,
  SITE,
} from './pageMeta'

// The gallery addresses its open image as ?image=<at-uri>, and that URL gets
// shared as readily as the canonical /image/:did/:rkey one. Both must resolve to
// the same record or a shared lightbox link unfurls as the site logo.
describe('imageTargetFromUrl', () => {
  it('reads the did and rkey from an image path', () => {
    expect(imageTargetFromUrl('/image/did:plc:abc/3msc', '')).toEqual({
      did: 'did:plc:abc',
      rkey: '3msc',
    })
  })

  it('reads the did and rkey from an ?image= at-uri', () => {
    expect(
      imageTargetFromUrl('/gallery', '?image=at%3A%2F%2Fdid%3Aplc%3Aabc%2Fcom.luminframe.image%2F3msc')
    ).toEqual({ did: 'did:plc:abc', rkey: '3msc' })
  })

  it('does not match an ?image= uri from another collection', () => {
    // Only image records are an image page; an effect uri here is not one.
    expect(imageTargetFromUrl('/gallery', '?image=at://did:plc:abc/com.luminframe.effect/x')).toBeNull()
  })

  it('does not match a gallery with no open image', () => {
    expect(imageTargetFromUrl('/gallery', '?family=texture')).toBeNull()
  })
})

// escapeHtml guards the edge function: record titles and alt text are untrusted
// and get injected straight into the served HTML. A missed case is an injection.
describe('escapeHtml', () => {
  it('escapes the characters that break out of HTML/attributes', () => {
    expect(escapeHtml(`<img src=x onerror="alert('&')">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;&amp;&#39;)&quot;&gt;'
    )
  })
})

describe('imagePageMeta', () => {
  it('titles with the record title and uses the image as a large card', () => {
    const meta = imagePageMeta(
      { title: 'Tahoma', handle: 'nate.example', imageUrl: 'https://pds/blob' },
      'https://luminframe.com/image/did/rkey'
    )
    expect(meta.title).toBe('Tahoma — Luminframe')
    expect(meta.image).toBe('https://pds/blob')
    expect(meta.card).toBe('summary_large_image')
  })

  it('falls back to the site image and a summary card when the record has no blob', () => {
    // A blobless record can't be its own card — don't claim a large image.
    const meta = imagePageMeta({ handle: 'nate.example' }, 'https://luminframe.com/image/did/rkey')
    expect(meta.image).toBe(SITE.image)
    expect(meta.card).toBe('summary')
    expect(meta.title).toBe('Luminframe image by @nate.example')
  })

  it('ends the alt before appending the effects to it', () => {
    // Alt text is written as a phrase; without this the card reads
    // "A sunset over a field Made with Vibrance."
    const meta = imagePageMeta(
      { imageUrl: 'https://pds/blob', alt: 'A sunset over a field', effects: ['vibrance'] },
      'https://luminframe.com/image/did/rkey'
    )
    expect(meta.description).toBe('A sunset over a field. Made with Vibrance.')
  })

  it('names the effects when the record has no alt text', () => {
    const meta = imagePageMeta(
      { imageUrl: 'https://pds/blob', effects: ['filmGrain', 'halftone'] },
      'https://luminframe.com/image/did/rkey'
    )
    expect(meta.description).toBe('A Luminframe edit. Made with Film Grain, Halftone.')
  })

  it('does not name at:// effects, which have no recoverable display name', () => {
    const meta = imagePageMeta(
      { imageUrl: 'https://pds/blob', effects: ['at://did:plc:abc/com.luminframe.effect/x'] },
      'https://luminframe.com/image/did/rkey'
    )
    expect(meta.description).not.toContain('at://')
  })
})

describe('metaTags', () => {
  const animated = {
    imageUrl: 'https://pds/still',
    videoUrl: 'https://pds/clip',
    width: 1600,
    height: 900,
  }
  const keys = (input: Parameters<typeof imagePageMeta>[0]) =>
    metaTags(imagePageMeta(input, 'https://luminframe.com/image/did/rkey')).map((t) => t.key)

  it('claims the video type for an animated edit', () => {
    // og:video is ignored by crawlers unless og:type says the page is a video.
    const tags = metaTags(imagePageMeta(animated, 'https://luminframe.com/image/did/rkey'))
    expect(tags.find((t) => t.key === 'og:type')?.content).toBe('video.other')
    expect(keys(animated)).toEqual(expect.arrayContaining(['og:video', 'og:video:type']))
  })

  it('does not claim a video for a still', () => {
    expect(keys({ imageUrl: 'https://pds/still', width: 1600, height: 900 })).not.toContain('og:video')
  })

  it('does not claim an image size the record did not carry', () => {
    expect(keys({ imageUrl: 'https://pds/still' })).not.toContain('og:image:width')
  })
})

describe('renderMetaTags', () => {
  it('escapes untrusted content so an image title cannot break out of the tag', () => {
    // A record title is attacker-controllable and gets injected into HTML at the
    // edge — the quote must not close the content attribute early.
    const html = renderMetaTags(
      imagePageMeta({ title: '"><script>alert(1)</script>' }, 'https://luminframe.com/image/x/y')
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })
})

describe('staticPageMeta', () => {
  it('describes the gallery for /gallery', () => {
    expect(staticPageMeta('/gallery', 'https://luminframe.com/gallery').title).toBe('Gallery — Luminframe')
  })

  it('gives an image path a neutral fallback (refined later by the record)', () => {
    expect(staticPageMeta('/image/did/rkey', 'https://luminframe.com/image/did/rkey').title).toBe(
      'Luminframe image'
    )
  })

  it('describes the effect creator for /create', () => {
    expect(staticPageMeta('/create', 'https://luminframe.com/create').title).toBe(
      'Create an effect — Luminframe'
    )
  })

  it('describes the editor for the root path', () => {
    expect(staticPageMeta('/', 'https://luminframe.com/').title).toContain('edit photos')
  })
})
