#!/usr/bin/env node
/**
 * Publish the com.luminframe.image lexicon so AT Protocol resolvers can find and
 * validate it.
 *
 * It writes the lexicon (from lexicons/com/luminframe/image.json — the single
 * source of truth) as a `com.atproto.lexicon.schema` record in the authenticated
 * account's repo, keyed by the NSID. Idempotent: it uses putRecord, so re-running
 * updates the published schema in place.
 *
 * TWO THINGS make a lexicon authoritative, and this script only does the second:
 *   1. A DNS TXT record at `_lexicon.luminframe.com` with value `did=<DID>`,
 *      where <DID> is the account you run this as. (You add this in DNS.)
 *   2. The schema record in <DID>'s repo (this script). A resolver reverses the
 *      NSID to luminframe.com, reads the _lexicon TXT to get the DID, then fetches
 *      the schema record by rkey. Both must point at the SAME DID.
 *
 * The account you log in as should therefore be the one that owns the lexicon
 * authority — ideally an account whose handle is `luminframe.com`.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as (e.g. luminframe.com)
 *   ATP_APP_PASSWORD an app password (Bluesky: Settings → Privacy and security →
 *                    App passwords). NOT your main password.
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 *
 * Usage:
 *   ATP_IDENTIFIER=luminframe.com ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
 *     node scripts/publish-lexicon.mjs
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { AtpAgent } from '@atproto/api'

const here = dirname(fileURLToPath(import.meta.url))
const lexiconPath = resolve(here, '../lexicons/com/luminframe/image.json')

// Read and sanity-check the lexicon first, so a run with no credentials still
// validates the file (a useful dry check) before asking to authenticate.
const lexicon = JSON.parse(await readFile(lexiconPath, 'utf8'))
if (lexicon.lexicon !== 1 || typeof lexicon.id !== 'string' || typeof lexicon.defs !== 'object') {
  throw new Error(`${lexiconPath} is not a valid lexicon document (need lexicon: 1, id, defs).`)
}
if (lexicon.id !== 'com.luminframe.image') {
  throw new Error(`Unexpected lexicon id: ${lexicon.id}`)
}
console.log(`Loaded lexicon ${lexicon.id} (${Object.keys(lexicon.defs).length} defs).`)

const service = process.env.PDS_SERVICE || 'https://bsky.social'
const identifier = process.env.ATP_IDENTIFIER
const password = process.env.ATP_APP_PASSWORD
if (!identifier || !password) {
  console.error(
    '\nSet ATP_IDENTIFIER and ATP_APP_PASSWORD to publish. See this file’s header for details.'
  )
  process.exit(1)
}

const agent = new AtpAgent({ service })
await agent.login({ identifier, password })
const did = agent.assertDid
console.log(`Signed in as ${did} on ${service}.`)

// The schema record IS the lexicon, tagged with its record type. Its rkey is the
// NSID, so resolvers can fetch it directly by name.
const record = {
  $type: 'com.atproto.lexicon.schema',
  lexicon: lexicon.lexicon,
  id: lexicon.id,
  defs: lexicon.defs,
}

const res = await agent.com.atproto.repo.putRecord({
  repo: did,
  collection: 'com.atproto.lexicon.schema',
  rkey: lexicon.id,
  record,
})

console.log(`\n✓ Published schema record: ${res.data.uri}`)
console.log('\nFinish by confirming this DNS TXT record exists (authority = luminframe.com):')
console.log(`  _lexicon.luminframe.com   TXT   "did=${did}"`)
console.log(
  '\nOnce the TXT record resolves, com.luminframe.image is discoverable, and you can drop `validate: false` in LuminframePublishAdapter.'
)
