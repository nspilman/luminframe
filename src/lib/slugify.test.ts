import { isValidSlug, slugify } from './slugify'

describe('slugify', () => {
  it('collapses punctuation runs to single hyphens', () => {
    expect(slugify('Dreamy — Film!')).toBe('dreamy-film')
  })

  it('trims hyphens at the edges', () => {
    // A leading hyphen would fail EFFECT_SLUG_PATTERN's alphanumeric start.
    expect(slugify('  ~Dreamy Film~  ')).toBe('dreamy-film')
  })

  it('produces a pattern-valid slug from any name with usable characters', () => {
    expect(isValidSlug(slugify('99 Reds & Blues'))).toBe(true)
  })

  it('a name with no usable characters → empty (never a broken rkey)', () => {
    expect(slugify('!!!')).toBe('')
    expect(isValidSlug('')).toBe(false)
  })
})
