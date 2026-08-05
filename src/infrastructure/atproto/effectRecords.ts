import { EFFECT_COLLECTION } from '@/effects-contract'
import { fetchCollectionRecords, RawRecord } from './repoRecords'
import { listNetworkDids, mapWithConcurrency } from './luminframeFeed'

/**
 * Fetching com.luminframe.effect records — published custom shader effects,
 * one author's or the network's. A raw record is untrusted until
 * parseEffectRecord passes it.
 */

export type RawEffectRecord = RawRecord

/** Every com.luminframe.effect record in one repo. */
export async function fetchRepoEffectRecords(did: string): Promise<RawEffectRecord[]> {
  return fetchCollectionRecords(did, EFFECT_COLLECTION)
}

/**
 * Every effect record the network will show us: ask the relay which repos hold
 * one, then read each of those repos. Same two-step the image feed walks.
 *
 * `maxRepos` bounds the fan-out. It is a real cap, not a formality — one HTTP
 * round trip per author — so when it bites, the caller is told how many repos
 * went unread rather than being handed a short list that looks complete.
 */
export async function fetchNetworkEffectRecords(
  maxRepos: number = 100
): Promise<{ records: RawEffectRecord[]; unreadRepos: number }> {
  const { dids } = await listNetworkDids(EFFECT_COLLECTION)
  const records = await mapWithConcurrency(dids.slice(0, maxRepos), 8, fetchRepoEffectRecords)
  return { records, unreadRepos: Math.max(0, dids.length - maxRepos) }
}
