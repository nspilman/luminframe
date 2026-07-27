import { Color } from '@/domain/value-objects/Color'
import { serializeRecipe } from '@/lib/shaders/serializeRecipe'
import { buildRecipeRecord, parseRecipeRecord } from '@/effects-contract'
import {
  LOOK_STORAGE_KEY,
  StoredLookDraft,
  defFromLookDraft,
  deleteLookDraft,
  loadLookDrafts,
  lookDraftKey,
  parseLookDraftKey,
  saveLookDraft,
} from './lookDrafts'

const draft = (overrides: Partial<StoredLookDraft> = {}): StoredLookDraft => ({
  slug: 'dreamy-film',
  name: 'Dreamy Film',
  steps: [{ type: 'blur', params: { radius: 4 } }],
  updatedAt: '2026-07-26T00:00:00.000Z',
  ...overrides,
})

beforeEach(() => localStorage.clear())

describe('look draft store', () => {
  it('round-trips a saved draft', () => {
    saveLookDraft(draft())
    expect(loadLookDrafts()).toEqual([draft()])
  })

  it('upserts by slug', () => {
    saveLookDraft(draft())
    saveLookDraft(draft({ name: 'Dreamier Film' }))
    expect(loadLookDrafts()).toEqual([draft({ name: 'Dreamier Film' })])
  })

  it('version mismatch discards the store', () => {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ version: 99, drafts: [draft()] }))
    expect(loadLookDrafts()).toEqual([])
  })

  it('deletes by slug', () => {
    saveLookDraft(draft())
    deleteLookDraft('dreamy-film')
    expect(loadLookDrafts()).toEqual([])
  })

  it('draft key round-trips through its parser', () => {
    expect(parseLookDraftKey(lookDraftKey('dreamy-film'))).toBe('dreamy-film')
  })

  it('parseLookDraftKey rejects other schemes', () => {
    expect(parseLookDraftKey('at://did:plc:x/com.luminframe.recipe/y')).toBeNull()
  })
})

describe('defFromLookDraft', () => {
  it('omits empty macros so the built record carries none', () => {
    const def = defFromLookDraft(draft({ macros: [] }))
    expect('macros' in def).toBe(false)
  })

  it('a stack serialized by the editor parses clean through the recipe grammar', () => {
    // The bridge the Save-this-look door depends on: serializeRecipe's output
    // (Color → hex string, Float32Array → number[], Image dropped) must all be
    // shapes the recipe grammar accepts as step params.
    const steps = serializeRecipe([
      { type: 'blur', params: { radius: 4, tint: Color.fromHex('#ff8800'), imageTexture: null } },
      { type: 'at://did:plc:abc/com.luminframe.effect/warm-grain', params: { center: new Float32Array([0.5, 0.5]) } },
    ])
    const def = defFromLookDraft(draft({ steps }))
    expect(parseRecipeRecord(buildRecipeRecord(def, '2026-07-26T00:00:00.000Z'))).toEqual({
      ok: true,
      def,
    })
  })
})
