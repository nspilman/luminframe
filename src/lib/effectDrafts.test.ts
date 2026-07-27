import {
  defFromDraft,
  draftKey,
  parseDraftKey,
  loadDrafts,
  saveDraft,
  deleteDraft,
  StoredDraft,
  STORAGE_KEY,
} from './effectDrafts'
import { buildEffectRecord, parseEffectRecord } from '@/effects-contract'

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
