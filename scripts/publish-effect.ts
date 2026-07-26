#!/usr/bin/env npx tsx
/**
 * Publish a custom shader effect to your PDS as a com.luminframe.effect record.
 *
 * An effect is authored as a directory:
 *   effects/<slug>/effect.json   metadata: slug, name, description?, params, animatedBy?
 *   effects/<slug>/body.glsl     the fragment shader body (see the env contract in
 *                                src/effects-contract/constants.ts for what it may reference)
 *
 * The record is validated with the SAME grammar the app applies when loading
 * (src/effects-contract) — so a run with no credentials is a useful dry check:
 * it prints every violation and exits before asking to authenticate. The rkey
 * is the slug, and putRecord is idempotent, so re-running after an edit
 * updates the published effect in place.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as
 *   ATP_APP_PASSWORD an app password (NOT your main password)
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 *
 * Usage:
 *   ATP_IDENTIFIER=you.example ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
 *     npx tsx scripts/publish-effect.ts effects/invert
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { AtpAgent } from '@atproto/api'
import {
  EFFECT_COLLECTION,
  ENV_VERSION,
  buildEffectRecord,
  parseEffectRecord,
} from '../src/effects-contract'

const dirArg = process.argv[2]
if (!dirArg) {
  console.error('Usage: npx tsx scripts/publish-effect.ts <effect directory, e.g. effects/invert>')
  process.exit(1)
}
const dir = resolve(process.cwd(), dirArg)

const meta = JSON.parse(await readFile(resolve(dir, 'effect.json'), 'utf8'))
const body = await readFile(resolve(dir, 'body.glsl'), 'utf8')

const slug = meta.slug
if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('effect.json: slug required — lowercase letters, digits, hyphens (it becomes the record key)')
  process.exit(1)
}

const record = buildEffectRecord(
  {
    name: meta.name,
    description: meta.description,
    env: ENV_VERSION,
    params: meta.params ?? [],
    body,
    animatedBy: meta.animatedBy,
  },
  new Date().toISOString()
)

const parsed = parseEffectRecord(record)
if (!parsed.ok) {
  console.error(`\n${dirArg} is not a valid effect:`)
  for (const error of parsed.errors) console.error(`  ✗ ${error}`)
  process.exit(1)
}
console.log(`Validated effect "${parsed.def.name}" (${parsed.def.params.length} params, env ${ENV_VERSION}).`)

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

const res = await agent.com.atproto.repo.putRecord({
  repo: did,
  collection: EFFECT_COLLECTION,
  rkey: slug,
  record,
})

console.log(`\n✓ Published effect: ${res.data.uri}`)
console.log('Luminframe will load it into your library the next time you open the editor signed in.')
