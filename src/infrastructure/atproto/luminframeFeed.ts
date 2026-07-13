/**
 * Reads com.luminframe.image records back out of the network — one repo's worth
 * (a person's gallery) or the whole network (everyone who has ever saved one).
 *
 * Everything here is a *public* read over plain XRPC GETs — no auth, no agent —
 * so the gallery works signed-out. Two building blocks:
 *
 *   - listReposByCollection (on a relay) enumerates every DID in the network with
 *     a com.luminframe.image record — the official, complete way to find them all.
 *   - listRecords (on each DID's PDS) returns that repo's records.
 *
 * Identities (DID → PDS host + handle) resolve via plc.directory, cached for the
 * session. Blobs render straight from their PDS's getBlob endpoint.
 *
 * The pure shapers — building a blob URL, reading a PDS/handle out of a DID
 * document, turning a raw record into a view — are separated from the fetches and
 * tested in luminframeFeed.test.ts, since they're where a typo silently breaks a
 * link or a missing field blanks an image.
 */

import { StrongRef } from '@/types/atproto'
import { RawRecipeStep } from '@/types/recipe'

export const LUMINFRAME_COLLECTION = 'com.luminframe.image'
const DEFAULT_RELAY = 'https://relay1.us-west.bsky.network'
const PLC_DIRECTORY = 'https://plc.directory'

/** A com.luminframe.image record resolved into everything the UI needs to show it. */
export interface LuminframeImageView {
  /** at://did/com.luminframe.image/rkey */
  uri: string
  /** The record's own CID — needed to reference it as a strongRef (e.g. remix lineage). */
  cid: string
  rkey: string
  did: string
  /** The author's handle, e.g. alice.bsky.social; null if it couldn't be resolved. */
  handle: string | null
  /** getBlob URL for the image, or null if the record carried no blob. */
  imageUrl: string | null
  aspectRatio: { width: number; height: number }
  alt?: string
  title?: string
  /** Effect keys applied, in order (the edit recipe). */
  effects: string[]
  /** The executable effect stack with params — the applyable recipe (v2), if stored. */
  recipe?: RawRecipeStep[]
  /** The record this image was remixed from, if any — its lineage (v2). */
  remixOf?: StrongRef
  createdAt: string
}

/** The PDS host and handle for a DID, read out of its DID document. */
export interface Identity {
  pds: string | null
  handle: string | null
}

interface RawRecord {
  uri: string
  /** The record's CID (present on listRecords/getRecord responses). */
  cid?: string
  value: {
    image?: { ref?: { $link?: string } }
    aspectRatio?: { width: number; height: number }
    alt?: string
    title?: string
    effects?: unknown
    recipe?: unknown
    remixOf?: unknown
    createdAt?: string
  }
}

/** Read a strongRef ({uri, cid}) out of freeform record data, or undefined if malformed. */
function parseStrongRef(value: unknown): StrongRef | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { uri, cid } = value as { uri?: unknown; cid?: unknown }
  if (typeof uri === 'string' && typeof cid === 'string') return { uri, cid }
  return undefined
}

/** Read the recipe (steps with a string `type`) out of freeform record data. */
function parseRecipe(value: unknown): RawRecipeStep[] | undefined {
  if (!Array.isArray(value)) return undefined
  const steps = value
    .filter((s): s is RawRecipeStep =>
      !!s && typeof s === 'object' && typeof (s as { type?: unknown }).type === 'string'
    )
    .map((s) => (s.params && typeof s.params === 'object' ? { type: s.type, params: s.params } : { type: s.type }))
  return steps.length > 0 ? steps : undefined
}

// ── Pure shapers (tested) ─────────────────────────────────────────────────────

/** The public getBlob URL for a blob CID in a given repo on a given PDS. */
export function getBlobUrl(pds: string, did: string, cid: string): string {
  return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}

/** Read the atproto PDS endpoint and handle out of a DID document. */
export function parseIdentity(didDoc: {
  service?: { id: string; type?: string; serviceEndpoint?: string }[]
  alsoKnownAs?: string[]
}): Identity {
  const pds =
    didDoc.service?.find((s) => s.id.endsWith('atproto_pds'))?.serviceEndpoint ?? null
  const aka = didDoc.alsoKnownAs?.find((a) => a.startsWith('at://'))
  const handle = aka ? aka.slice('at://'.length) : null
  return { pds, handle }
}

/** The DID, collection, and rkey of an at:// URI, or null if it isn't one. */
export function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
  if (!uri.startsWith('at://')) return null
  const [did, collection, rkey] = uri.slice('at://'.length).split('/')
  if (!did || !collection || !rkey) return null
  return { did, collection, rkey }
}

/** Turn one raw listRecords entry into a view, given its author's resolved identity. */
export function recordToView(record: RawRecord, did: string, pds: string, handle: string | null): LuminframeImageView {
  const value = record.value ?? {}
  const blobCid = value.image?.ref?.$link
  const rkey = record.uri.split('/').pop() ?? ''
  return {
    uri: record.uri,
    cid: record.cid ?? '',
    rkey,
    did,
    handle,
    imageUrl: blobCid ? getBlobUrl(pds, did, blobCid) : null,
    aspectRatio: value.aspectRatio ?? { width: 1, height: 1 },
    alt: value.alt,
    title: value.title,
    effects: Array.isArray(value.effects) ? value.effects.filter((e): e is string => typeof e === 'string') : [],
    recipe: parseRecipe(value.recipe),
    remixOf: parseStrongRef(value.remixOf),
    createdAt: value.createdAt ?? '',
  }
}

// ── Fetches ───────────────────────────────────────────────────────────────────

const identityCache = new Map<string, Identity>()

/** Resolve a DID to its PDS host + handle (did:plc via plc.directory), cached. */
export async function resolveIdentity(did: string): Promise<Identity> {
  const cached = identityCache.get(did)
  if (cached) return cached
  let identity: Identity = { pds: null, handle: null }
  try {
    const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}`)
    if (res.ok) identity = parseIdentity(await res.json())
  } catch {
    // Leave the null identity; the caller skips repos it can't reach.
  }
  identityCache.set(did, identity)
  return identity
}

/** One page of DIDs that have a com.luminframe.image record, network-wide. */
export async function listNetworkDids(
  cursor?: string,
  relay: string = DEFAULT_RELAY
): Promise<{ dids: string[]; cursor?: string }> {
  const params = new URLSearchParams({ collection: LUMINFRAME_COLLECTION, limit: '1000' })
  if (cursor) params.set('cursor', cursor)
  const res = await fetch(`${relay}/xrpc/com.atproto.sync.listReposByCollection?${params}`)
  if (!res.ok) throw new Error(`listReposByCollection failed: ${res.status}`)
  const data = await res.json()
  const dids = Array.isArray(data.repos)
    ? data.repos.map((r: { did: string }) => r.did).filter(Boolean)
    : []
  return { dids, cursor: data.cursor }
}

/** Run `task` over `items` with at most `limit` in flight; failures resolve to []. */
async function mapWithConcurrency<T>(
  items: string[],
  limit: number,
  task: (item: string) => Promise<T[]>
): Promise<T[]> {
  const results: T[][] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = await task(items[index])
      } catch {
        results[index] = []
      }
    }
  })
  await Promise.all(workers)
  return results.flat()
}

/**
 * Every com.luminframe.image across the network, newest first. Enumerates the
 * DIDs that have the collection (capped so a huge network can't fan out
 * unbounded), fetches each repo's records with bounded concurrency, and sorts by
 * time. `maxRepos` bounds the fan-out; raising it (or a backend index) is the
 * scaling path as the lexicon grows.
 */
export async function fetchNetworkImages(maxRepos = 200): Promise<LuminframeImageView[]> {
  const { dids } = await listNetworkDids()
  const views = await mapWithConcurrency(dids.slice(0, maxRepos), 8, fetchRepoImages)
  return views.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Resolve a single image by its AT-URI, standalone — the path a deep link takes
 * when the record isn't (or isn't yet) in the loaded feed. Reads the one record
 * straight from its author's PDS. Returns null if the URI is malformed, the
 * identity won't resolve, or the record is gone.
 */
export async function fetchImageByUri(uri: string): Promise<LuminframeImageView | null> {
  const parsed = parseAtUri(uri)
  if (!parsed) return null
  const identity = await resolveIdentity(parsed.did)
  if (!identity.pds) return null
  const params = new URLSearchParams({
    repo: parsed.did,
    collection: parsed.collection,
    rkey: parsed.rkey,
  })
  try {
    const res = await fetch(`${identity.pds}/xrpc/com.atproto.repo.getRecord?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.uri || !data?.value) return null
    return recordToView(data, parsed.did, identity.pds, identity.handle)
  } catch {
    return null
  }
}

/**
 * Walk a remix chain upward to its root, following each record's parent link.
 * `fetchNode` resolves a URI to that record and the URI of *its* parent (or null
 * at a dead/foreign link). Bounded two ways so a malformed record can't hang the
 * page: `maxDepth` caps a very long chain, and a seen-set breaks a cycle (a record
 * whose lineage loops back on itself). Returns ancestors oldest-first — root … the
 * immediate parent — with the starting record excluded (the caller already has it).
 *
 * Pure over its injected fetcher, so the termination guarantees (stops at the root,
 * at a dead link, at the depth cap, and on a cycle) are tested without the network.
 */
export async function walkAncestry<T>(
  firstParentUri: string | undefined,
  fetchNode: (uri: string) => Promise<{ node: T; parentUri?: string } | null>,
  maxDepth = 12
): Promise<T[]> {
  const chain: T[] = []
  const seen = new Set<string>()
  let nextUri = firstParentUri
  while (nextUri && chain.length < maxDepth && !seen.has(nextUri)) {
    seen.add(nextUri)
    const result = await fetchNode(nextUri)
    if (!result) break
    chain.push(result.node)
    nextUri = result.parentUri
  }
  return chain.reverse()
}

/** The ancestry of one image — the remix chain above it, oldest first (may be empty). */
export async function fetchAncestry(image: LuminframeImageView): Promise<LuminframeImageView[]> {
  return walkAncestry(image.remixOf?.uri, async (uri) => {
    const node = await fetchImageByUri(uri)
    return node ? { node, parentUri: node.remixOf?.uri } : null
  })
}

/**
 * The direct remixes of one image — records whose remixOf points at this URI,
 * newest first. Found by scanning the network (the same fan-out the gallery uses)
 * and filtering; there's no reverse index yet, so this shares the gallery's
 * scaling path (a backend index is how it grows past a client-side sweep).
 */
export async function fetchRemixesOf(uri: string): Promise<LuminframeImageView[]> {
  const all = await fetchNetworkImages()
  return all.filter((view) => view.remixOf?.uri === uri)
}

/** Every com.luminframe.image record in one repo, newest first, resolved to views. */
export async function fetchRepoImages(did: string): Promise<LuminframeImageView[]> {
  const identity = await resolveIdentity(did)
  if (!identity.pds) return []
  const params = new URLSearchParams({
    repo: did,
    collection: LUMINFRAME_COLLECTION,
    limit: '100',
    reverse: 'true', // newest first
  })
  const res = await fetch(`${identity.pds}/xrpc/com.atproto.repo.listRecords?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  const records: RawRecord[] = Array.isArray(data.records) ? data.records : []
  return records.map((r) => recordToView(r, did, identity.pds!, identity.handle))
}
