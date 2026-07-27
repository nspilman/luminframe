import { RECIPE_COLLECTION } from '@/effects-contract'
import { fetchCollectionRecords, RawRecord } from './repoRecords'

/**
 * Fetching com.luminframe.recipe records — the user's published Looks. A raw
 * record is untrusted until parseRecipeRecord passes it. Single-record reads
 * (the ?look= deep link) go through fetchRecordByUri directly.
 */

export type RawRecipeRecord = RawRecord

/** Every com.luminframe.recipe record in one repo. */
export async function fetchRepoRecipeRecords(did: string): Promise<RawRecipeRecord[]> {
  return fetchCollectionRecords(did, RECIPE_COLLECTION)
}
