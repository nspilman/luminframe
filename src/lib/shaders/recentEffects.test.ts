import { pushRecent, loadRecents, saveRecents, STORAGE_KEY, RECENTS_MAX } from './recentEffects'
import { ShaderType } from '@/types/shader'

// pushRecent maintains the most-recent-first, deduped, capped list.
describe('pushRecent', () => {
  it('puts a new effect at the front', () => {
    expect(pushRecent(['vignette'], 'wave')).toEqual(['wave', 'vignette'])
  })

  it('promotes a re-used effect to the front instead of duplicating it', () => {
    expect(pushRecent(['vignette', 'wave', 'glitch'], 'glitch')).toEqual(['glitch', 'vignette', 'wave'])
  })

  it('caps the list at max, dropping the oldest', () => {
    // Six already, add a seventh with max 6 → the seventh leads, the oldest falls off.
    const full: ShaderType[] = ['vignette', 'wave', 'glitch', 'dream', 'sepia', 'bloom']
    const result = pushRecent(full, 'swirl', 6)
    expect(result).toEqual(['swirl', 'vignette', 'wave', 'glitch', 'dream', 'sepia'])
  })
})

// loadRecents reads persisted recents, guarding against stale/garbage storage.
describe('loadRecents', () => {
  afterEach(() => localStorage.clear())

  it('round-trips saved recents', () => {
    saveRecents(['wave', 'vignette'])
    expect(loadRecents()).toEqual(['wave', 'vignette'])
  })

  it('drops keys that are not currently-known effects', () => {
    // A removed/renamed effect from an older version must not reach shaderLibrary.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['wave', 'notAnEffect', 'vignette']))
    expect(loadRecents()).toEqual(['wave', 'vignette'])
  })

  it('returns empty for non-array or corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{')
    expect(loadRecents()).toEqual([])
  })

  it('caps what it reads at RECENTS_MAX', () => {
    const seven = ['vignette', 'wave', 'glitch', 'dream', 'sepia', 'bloom', 'swirl']
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seven))
    expect(loadRecents()).toHaveLength(RECENTS_MAX)
  })
})
