import { EFFECT_COLLECTION } from '@/effects-contract'
import { fetchCollectionRecords, RawRecord } from './repoRecords'

/**
 * Fetching com.luminframe.effect records — the user's published custom shader
 * effects. A raw record is untrusted until parseEffectRecord passes it.
 */

export type RawEffectRecord = RawRecord

/** Every com.luminframe.effect record in one repo. */
export async function fetchRepoEffectRecords(did: string): Promise<RawEffectRecord[]> {
  return fetchCollectionRecords(did, EFFECT_COLLECTION)
}
