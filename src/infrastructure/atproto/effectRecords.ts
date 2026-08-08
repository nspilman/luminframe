import { EFFECT_COLLECTION, FEATURED_COLLECTION_URI, LUMINFRAME_DID, parseCollectionRecord } from '@/effects-contract'
import { fetchCollectionRecords, fetchRecordByUri, RawRecord } from './repoRecords'
import { listNetworkDids, mapWithConcurrency, parseAtUri } from './luminframeFeed'

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
 * The default library: the effects the featured collection points at, in the
 * curator's order. Membership is data — a listed effect may live in any
 * author's repo, so this resolves by grouping the URIs by repo (one
 * listRecords round trip per distinct author) rather than fetching each URI
 * alone. A listed URI whose record is gone simply doesn't appear.
 *
 * No collection record yet (or an invalid one) falls back to the repo dump —
 * luminframe.com's own effects — so the library survives the cutover in
 * either order.
 */
export async function fetchFeaturedEffectRecords(): Promise<RawEffectRecord[]> {
  const collection = await fetchRecordByUri(FEATURED_COLLECTION_URI)
  const parsed = collection ? parseCollectionRecord(collection.value) : null
  if (!parsed?.ok) return fetchRepoEffectRecords(LUMINFRAME_DID)

  const dids = [...new Set(parsed.def.effectUris.map((uri) => parseAtUri(uri)?.did).filter((d): d is string => !!d))]
  // ponytail: listRecords reads one page (100) per repo — a listed effect past
  // an author's first page won't resolve; paginate when a repo outgrows it.
  const records = await mapWithConcurrency(dids, 8, fetchRepoEffectRecords)
  const byUri = new Map(records.map((r) => [r.uri, r]))
  return parsed.def.effectUris.flatMap((uri) => byUri.get(uri) ?? [])
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
