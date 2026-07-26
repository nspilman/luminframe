import { EFFECT_COLLECTION } from '@/effects-contract'
import { resolveIdentity } from './luminframeFeed'

/**
 * Fetching com.luminframe.effect records — the user's published custom shader
 * effects. Same posture as luminframeFeed: records are public, so reads are
 * unauthenticated raw XRPC by DID, and every failure resolves to an empty
 * list (a missing PDS or network error means "no custom effects right now",
 * never a broken editor).
 */

export interface RawEffectRecord {
  /** The record's AT-URI — the key custom effects live under everywhere. */
  uri: string
  /** The record value, untrusted until parseEffectRecord passes it. */
  value: unknown
}

/** Every com.luminframe.effect record in one repo. */
export async function fetchRepoEffectRecords(did: string): Promise<RawEffectRecord[]> {
  try {
    const identity = await resolveIdentity(did)
    if (!identity.pds) return []
    const params = new URLSearchParams({
      repo: did,
      collection: EFFECT_COLLECTION,
      limit: '100',
    })
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
