import {
  defFromDraft,
  draftKey,
  parseDraftKey,
  loadDrafts,
  saveDraft,
  deleteDraft,
  remixSlug,
  StoredDraft,
  STORAGE_KEY,
} from './effectDrafts'
import { buildEffectRecord, parseEffectRecord, EFFECT_SLUG_PATTERN } from '@/effects-contract'

const draft = (overrides: Partial<StoredDraft> = {}): StoredDraft => ({
  slug: 'invert',
  name: 'Invert',
  params: [{ type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 }],
  body: 'void main() { gl_FragColor = vec4(1.0 - texture2D(imageTexture, vUv).rgb * amount, 1.0); }',
  updatedAt: '2026-07-26T00:00:00.000Z',
  ...overrides,
})

afterEach(() => localStorage.clear())

describe('draft storage', () => {
  it('round-trips a saved draft', () => {
    saveDraft(draft())
    expect(loadDrafts()).toEqual([draft()])
  })

  it('saving the same slug replaces the earlier draft', () => {
    saveDraft(draft({ body: 'old' }))
    saveDraft(draft({ body: 'void main() { gl_FragColor = vec4(1.0); }' }))
    const drafts = loadDrafts()
    expect(drafts).toHaveLength(1)
    expect(drafts[0].body).toContain('vec4(1.0)')
  })

  it('deletes a draft by slug', () => {
    saveDraft(draft())
    saveDraft(draft({ slug: 'warmth' }))
    deleteDraft('invert')
    expect(loadDrafts().map((d) => d.slug)).toEqual(['warmth'])
  })

  it('version mismatch → empty', () => {
    // A future build that bumps VERSION must not rehydrate this store's shape.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, drafts: [draft()] }))
    expect(loadDrafts()).toEqual([])
  })

  it('malformed storage → empty', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{')
    expect(loadDrafts()).toEqual([])
  })
})

describe('draftKey / parseDraftKey', () => {
  it('are inverse', () => {
    expect(parseDraftKey(draftKey('invert'))).toBe('invert')
  })

  it('parseDraftKey rejects other schemes', () => {
    expect(parseDraftKey('at://did:plc:x/com.luminframe.effect/invert')).toBeNull()
  })
})

describe('defFromDraft', () => {
  it('stamps the current env version', () => {
    expect(defFromDraft(draft()).env).toBe(1)
  })

  it('produces a definition whose built record parses clean', () => {
    // The drafts↔grammar seam: a draft wrapped as a record must pass the same
    // parse the registry pipeline applies, or drafts would silently vanish.
    const record = buildEffectRecord(defFromDraft(draft()), '2026-07-26T00:00:00.000Z')
    expect(parseEffectRecord(record).ok).toBe(true)
  })
})

describe('remixSlug', () => {
  it('bends a display name to the slug grammar', () => {
    expect(remixSlug('Ring Twist!', [])).toBe('ring-twist')
  })

  it('steps past a slug the user already has', () => {
    // The collision that matters is with a *published* slug: reusing one would
    // make publishing the remix overwrite the remixer's own record.
    expect(remixSlug('Ring Twist', ['ring-twist'])).toBe('ring-twist-2')
  })

  it('produces a usable slug from a name with nothing slugworthy in it', () => {
    // Non-Latin names slug to empty; the fallback keeps the draft storable,
    // since an empty slug has no identity to persist under.
    expect(remixSlug('___', [])).toBe('remix')
  })

  it('emits only slugs the grammar accepts', () => {
    for (const name of ['Ring Twist!', '  Leading & trailing  ', '9 Lives', '___'])
      expect(EFFECT_SLUG_PATTERN.test(remixSlug(name, []))).toBe(true)
  })
})
