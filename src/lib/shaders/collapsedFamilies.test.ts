import { toggleCollapsed, loadCollapsed, saveCollapsed, STORAGE_KEY } from './collapsedFamilies'

// toggleCollapsed flips a family id in and out of the collapsed set.
describe('toggleCollapsed', () => {
  it('adds an id that is not yet collapsed', () => {
    expect(toggleCollapsed(['tone'], 'color')).toEqual(['tone', 'color'])
  })

  it('removes an id that is already collapsed', () => {
    expect(toggleCollapsed(['tone', 'color'], 'tone')).toEqual(['color'])
  })
})

// loadCollapsed reads the remembered set, guarding against corrupt storage.
describe('loadCollapsed', () => {
  afterEach(() => localStorage.clear())

  it('round-trips saved ids', () => {
    saveCollapsed(['tone', 'texture'])
    expect(loadCollapsed()).toEqual(['tone', 'texture'])
  })

  it('returns empty (all open) for corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadCollapsed()).toEqual([])
  })
})
