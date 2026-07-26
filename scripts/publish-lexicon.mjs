#!/usr/bin/env node
/**
 * Publish the com.luminframe.* lexicons so AT Protocol resolvers can find and
 * validate them.
 *
 * It writes each lexicon (from lexicons/**​/*.json — the single source of truth)
 * as a `com.atproto.lexicon.schema` record in the authenticated account's repo,
 * keyed by the NSID. Idempotent: it uses putRecord, so re-running updates the
 * published schemas in place.
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
 * Usage (all lexicons, or specific files):
 *   ATP_IDENTIFIER=luminframe.com ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
 *     node scripts/publish-lexicon.mjs [lexicons/com/luminframe/effect.json ...]
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { AtpAgent } from '@atproto/api'

const here = dirname(fileURLToPath(import.meta.url))

/** Every .json under lexicons/, walked so new lexicons publish without a script edit. */
async function findLexiconFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await findLexiconFiles(path)))
    else if (entry.name.endsWith('.json')) files.push(path)
  }
  return files.sort()
}

const paths =
  process.argv.length > 2
    ? process.argv.slice(2).map((p) => resolve(process.cwd(), p))
    : await findLexiconFiles(resolve(here, '../lexicons'))

// Read and sanity-check every lexicon first, so a run with no credentials still
// validates the files (a useful dry check) before asking to authenticate.
const lexicons = []
for (const path of paths) {
  const lexicon = JSON.parse(await readFile(path, 'utf8'))
  if (lexicon.lexicon !== 1 || typeof lexicon.id !== 'string' || typeof lexicon.defs !== 'object') {
    throw new Error(`${path} is not a valid lexicon document (need lexicon: 1, id, defs).`)
  }
  console.log(`Loaded lexicon ${lexicon.id} (${Object.keys(lexicon.defs).length} defs).`)
  lexicons.push(lexicon)
}

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
for (const lexicon of lexicons) {
  const res = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: 'com.atproto.lexicon.schema',
    rkey: lexicon.id,
    record: {
      $type: 'com.atproto.lexicon.schema',
      lexicon: lexicon.lexicon,
      id: lexicon.id,
      defs: lexicon.defs,
    },
  })
  console.log(`✓ Published schema record: ${res.data.uri}`)
}

console.log('\nFinish by confirming this DNS TXT record exists (authority = luminframe.com):')
console.log(`  _lexicon.luminframe.com   TXT   "did=${did}"`)
