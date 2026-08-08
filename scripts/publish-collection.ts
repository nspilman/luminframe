#!/usr/bin/env npx tsx
/**
 * Publish (or update) the featured collection — the record the app loads its
 * default library from. Curation is data: promoting a community effect later
 * means editing this record's `effects` list, not deploying.
 *
 * Merge-safe: if a featured record already exists, its order and every URI it
 * lists (including other authors' effects added by hand) are kept; your own
 * repo's effects that aren't listed yet are appended, sorted by rkey. An
 * unchanged list skips the write, so re-running never thrashes CIDs.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as (the curator — luminframe.com)
 *   ATP_APP_PASSWORD an app password (NOT your main password)
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 *
 * Usage:
 *   ATP_IDENTIFIER=luminframe.com ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
 *     npx tsx scripts/publish-collection.ts
 */
import {
  COLLECTION_NSID,
  EFFECT_COLLECTION,
  MAX_COLLECTION_EFFECTS,
  buildCollectionRecord,
  parseCollectionRecord,
} from '../src/effects-contract'
import { loginFromEnv } from './atp'

const agent = await loginFromEnv()
const did = agent.assertDid

const existing = await agent.com.atproto.repo
  .getRecord({ repo: did, collection: COLLECTION_NSID, rkey: 'featured' })
  .then((res) => res.data)
  .catch(() => null)
const existingParsed = existing ? parseCollectionRecord(existing.value) : null
if (existingParsed && !existingParsed.ok) {
  console.error('Existing featured record fails the grammar — fix it by hand before merging:')
  for (const error of existingParsed.errors) console.error(`  ✗ ${error}`)
  process.exit(1)
}
const kept = existingParsed?.ok ? existingParsed.def.effectUris : []

// ponytail: one listRecords page — paginate when the repo passes 100 effects.
const own = await agent.com.atproto.repo.listRecords({
  repo: did,
  collection: EFFECT_COLLECTION,
  limit: 100,
})
const ownUris = own.data.records
  .map((r) => r.uri)
  .filter((uri) => !kept.includes(uri))
  .sort()

const effectUris = [...kept, ...ownUris]
if (effectUris.length > MAX_COLLECTION_EFFECTS) {
  console.error(`Merged list is ${effectUris.length} effects; the collection cap is ${MAX_COLLECTION_EFFECTS}.`)
  process.exit(1)
}
if (ownUris.length === 0 && existingParsed?.ok) {
  console.log(`Featured collection already lists all ${kept.length} effects — nothing to write.`)
  process.exit(0)
}

const createdAt =
  (existing?.value as { createdAt?: string } | undefined)?.createdAt ?? new Date().toISOString()
const record = buildCollectionRecord(
  { name: existingParsed?.ok ? existingParsed.def.name : 'Featured', effectUris },
  createdAt
)

const res = await agent.com.atproto.repo.putRecord({
  repo: did,
  collection: COLLECTION_NSID,
  rkey: 'featured',
  record,
})
console.log(`\n✓ Published featured collection (${effectUris.length} effects): ${res.data.uri}`)
