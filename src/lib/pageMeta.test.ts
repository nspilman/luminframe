import { escapeHtml, imagePageMeta, staticPageMeta, renderMetaTags, SITE } from './pageMeta'

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

  it('describes the editor for the root path', () => {
    expect(staticPageMeta('/', 'https://luminframe.com/').title).toContain('edit photos')
  })
})
