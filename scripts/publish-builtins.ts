#!/usr/bin/env npx tsx
/**
 * Publish every builtin effect as a com.luminframe.effect record — intended
 * to be run signed in as luminframe.com, the app's own account, so the whole
 * library carries stable, citable at:// names.
 *
 * The records are GENERATED from the shipped code (toEffectDefinition over
 * shaderLibrary), never hand-copied — the repo stays the single source of
 * truth and re-running after an effect changes republishes it in place
 * (putRecord, rkey = kebab-case key). The same round trip is pinned by
 * toEffectDefinition.test.ts before anything leaves this machine.
 *
 * With no credentials this is a dry run: every builtin is validated against
 * the record grammar and the plan is printed. That run is safe anywhere.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as (use luminframe.com)
 *   ATP_APP_PASSWORD an app password (NOT the main password)
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 */
import { AtpAgent } from '@atproto/api'
import { EFFECT_COLLECTION, buildEffectRecord, parseEffectRecord } from '../src/effects-contract'
import { shaderLibrary } from '../src/lib/shaders'
import { slugForEffectKey, toEffectDefinition } from '../src/lib/shaders/toEffectDefinition'
import { ShaderType } from '../src/types/shader'

const keys = Object.keys(shaderLibrary) as ShaderType[]
const plan = keys.map((key) => {
  const def = toEffectDefinition(key, shaderLibrary[key])
  const record = buildEffectRecord(def, new Date().toISOString())
  return { key, slug: slugForEffectKey(key), def, record }
})

let invalid = 0
for (const { key, record } of plan) {
  const parsed = parseEffectRecord(record)
  if (!parsed.ok) {
    invalid++
    console.error(`✗ ${key}:`)
    for (const error of parsed.errors) console.error(`    ${error}`)
  }
}
if (invalid > 0) {
  console.error(`\n${invalid} builtin(s) failed the grammar — nothing published.`)
  process.exit(1)
}

console.log(`Validated all ${plan.length} builtins against the record grammar:`)
for (const { key, slug, def } of plan) {
  console.log(`  ${slug.padEnd(24)} env ${def.env}  (${key})`)
}

const service = process.env.PDS_SERVICE || 'https://bsky.social'
const identifier = process.env.ATP_IDENTIFIER
const password = process.env.ATP_APP_PASSWORD
if (!identifier || !password) {
  console.log('\nDry run complete. Set ATP_IDENTIFIER and ATP_APP_PASSWORD to publish (see header).')
  process.exit(0)
}

const agent = new AtpAgent({ service })
await agent.login({ identifier, password })
const did = agent.assertDid
console.log(`\nSigned in as ${did} on ${service}.`)

for (const { slug, record } of plan) {
  const res = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: EFFECT_COLLECTION,
    rkey: slug,
    record,
  })
  console.log(`✓ ${res.data.uri}`)
}
console.log(`\nPublished ${plan.length} effects.`)
