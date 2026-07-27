import { parseAtUri, resolveIdentity } from './luminframeFeed'

/**
 * Raw record reads, generic over collection — the shared floor under the
 * effect and recipe fetchers. Same posture as luminframeFeed: records are
 * public, so reads are unauthenticated raw XRPC by DID, and every failure
 * resolves to nothing ([] or null) — a missing PDS or network error means
 * "no records right now", never a broken editor.
 */

export interface RawRecord {
  /** The record's AT-URI — the key it lives under everywhere. */
  uri: string
  /** The record value, untrusted until its grammar's parse passes it. */
  value: unknown
}

/** Every record of one collection in one repo. */
export async function fetchCollectionRecords(did: string, collection: string): Promise<RawRecord[]> {
  try {
    const identity = await resolveIdentity(did)
    if (!identity.pds) return []
    const params = new URLSearchParams({ repo: did, collection, limit: '100' })
    const res = await fetch(`${identity.pds}/xrpc/com.atproto.repo.listRecords?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    const records: unknown = data.records
    if (!Array.isArray(records)) return []
    return records
      .filter((r): r is { uri: string; value: unknown } =>
        typeof r === 'object' && r !== null && typeof (r as { uri?: unknown }).uri === 'string'
      )
      .map((r) => ({ uri: r.uri, value: r.value }))
  } catch {
    return []
  }
}

/** One record by AT-URI, straight from its author's PDS. */
export async function fetchRecordByUri(uri: string): Promise<RawRecord | null> {
  const parsed = parseAtUri(uri)
  if (!parsed) return null
  try {
    const identity = await resolveIdentity(parsed.did)
    if (!identity.pds) return null
    const params = new URLSearchParams({
      repo: parsed.did,
      collection: parsed.collection,
      rkey: parsed.rkey,
    })
    const res = await fetch(`${identity.pds}/xrpc/com.atproto.repo.getRecord?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.uri || !data?.value) return null
    return { uri: data.uri, value: data.value }
  } catch {
    return null
  }
}
