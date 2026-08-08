import { COLLECTION_NSID, CollectionDef, EFFECT_COLLECTION, FEATURED_COLLECTION_URI, LUMINFRAME_DID, parseCollectionRecord } from '@/effects-contract'
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

/** A collection record fetched and parsed, ready to resolve. */
export interface FetchedCollection {
  uri: string
  curatorDid: string
  def: CollectionDef
}

/** One collection record by AT-URI; null if missing or failing the grammar. */
export async function fetchCollectionByUri(uri: string): Promise<FetchedCollection | null> {
  const curatorDid = parseAtUri(uri)?.did
  if (!curatorDid) return null
  const record = await fetchRecordByUri(uri)
  const parsed = record ? parseCollectionRecord(record.value) : null
  return parsed?.ok ? { uri, curatorDid, def: parsed.def } : null
}

/**
 * The effect records a collection points at, in the curator's order.
 * Membership is data — a listed effect may live in any author's repo, so this
 * resolves by grouping the URIs by repo (one listRecords round trip per
 * distinct author) rather than fetching each URI alone. A listed URI whose
 * record is gone simply doesn't appear.
 */
export async function resolveCollectionEffects(def: CollectionDef): Promise<RawEffectRecord[]> {
  const dids = [...new Set(def.effectUris.map((uri) => parseAtUri(uri)?.did).filter((d): d is string => !!d))]
  // ponytail: listRecords reads one page (100) per repo — a listed effect past
  // an author's first page won't resolve; paginate when a repo outgrows it.
  const records = await mapWithConcurrency(dids, 8, fetchRepoEffectRecords)
  const byUri = new Map(records.map((r) => [r.uri, r]))
  return def.effectUris.flatMap((uri) => byUri.get(uri) ?? [])
}

/**
 * The default library: what the featured collection points at. No collection
 * record yet (or an invalid one) falls back to the repo dump —
 * luminframe.com's own effects — so the library survives the cutover in
 * either order.
 */
export async function fetchFeaturedEffectRecords(): Promise<RawEffectRecord[]> {
  const collection = await fetchCollectionByUri(FEATURED_COLLECTION_URI)
  return collection ? resolveCollectionEffects(collection.def) : fetchRepoEffectRecords(LUMINFRAME_DID)
}

/**
 * Every collection the network will show us, minus the featured one — it is
 * already the default library, and offering to follow it would only offer a
 * duplicate. Same relay two-step as the effect fan-out, same honest cap.
 */
export async function fetchNetworkCollections(
  maxRepos: number = 100
): Promise<{ collections: FetchedCollection[]; unreadRepos: number }> {
  const { dids } = await listNetworkDids(COLLECTION_NSID)
  const records = await mapWithConcurrency(dids.slice(0, maxRepos), 8, (did) =>
    fetchCollectionRecords(did, COLLECTION_NSID)
  )
  const collections = records
    .filter((r) => r.uri !== FEATURED_COLLECTION_URI)
    .flatMap((r) => {
      const curatorDid = parseAtUri(r.uri)?.did
      const parsed = parseCollectionRecord(r.value)
      return curatorDid && parsed.ok ? [{ uri: r.uri, curatorDid, def: parsed.def }] : []
    })
  return { collections, unreadRepos: Math.max(0, dids.length - maxRepos) }
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
