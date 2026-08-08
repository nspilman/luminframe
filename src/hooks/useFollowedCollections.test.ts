import {
  FOLLOWED_COLLECTIONS_KEY,
  followCollection,
  resetFollowedCollectionsForTest,
  unfollowCollection,
} from './useFollowedCollections'

/**
 * The follow list is the user's only record of whose lenses they chose —
 * these pin that it survives a reload (localStorage round trip) and that
 * unfollow really forgets. The fetch side is network I/O and stays untested
 * here; in jsdom it resolves to nothing and the store shrugs, same as offline.
 */

const URI = 'at://did:plc:curator/com.luminframe.collection/featured'

beforeEach(() => {
  localStorage.clear()
  resetFollowedCollectionsForTest()
})

describe('followCollection / unfollowCollection', () => {
  it('follow persists the URI', () => {
    followCollection(URI)
    expect(JSON.parse(localStorage.getItem(FOLLOWED_COLLECTIONS_KEY)!)).toEqual([URI])
  })

  it('follow is idempotent', () => {
    followCollection(URI)
    followCollection(URI)
    expect(JSON.parse(localStorage.getItem(FOLLOWED_COLLECTIONS_KEY)!)).toEqual([URI])
  })

  it('unfollow forgets the URI', () => {
    followCollection(URI)
    unfollowCollection(URI)
    expect(JSON.parse(localStorage.getItem(FOLLOWED_COLLECTIONS_KEY)!)).toEqual([])
  })
})
