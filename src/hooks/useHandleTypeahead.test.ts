import { normalizeHandleQuery } from './useHandleTypeahead'

// normalizeHandleQuery gates the network lookup — the cases that matter are the
// too-short inputs that must NOT fire a search, and the @/whitespace people type.
describe('normalizeHandleQuery', () => {
  it('strips a leading @ and surrounding whitespace', () => {
    expect(normalizeHandleQuery('  @zzstoatzz ')).toBe('zzstoatzz')
  })

  it('keeps a full handle as-is', () => {
    expect(normalizeHandleQuery('zzstoatzz.io')).toBe('zzstoatzz.io')
  })

  it('returns null below two characters (after stripping @)', () => {
    // '@a' → 'a' is one char — not worth a search
    expect(normalizeHandleQuery('@a')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(normalizeHandleQuery('   ')).toBeNull()
  })
})
