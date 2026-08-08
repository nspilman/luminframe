#!/usr/bin/env npx tsx
/**
 * Publish every builtin effect as a com.luminframe.effect record — run signed
 * in as luminframe.com, the app's own account, so the whole library carries
 * stable, citable at:// names.
 *
 * The records are GENERATED from the shipped code (toEffectDefinition over
 * shaderLibrary), never hand-copied — the repo stays the authoring surface
 * and re-running after an effect changes republishes it in place (putRecord,
 * rkey = kebab-case key). The same round trip is pinned by
 * toEffectDefinition.test.ts before anything leaves this machine.
 *
 * Idempotent against canon: it reads the published records first (public, no
 * auth) and writes only what actually differs, carrying each updated
 * record's original createdAt forward so the field keeps telling the truth.
 * A run where nothing changed writes nothing — and needs no credentials at
 * all, so it doubles as the dry check.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as (use luminframe.com)
 *   ATP_APP_PASSWORD an app password (NOT the main password)
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 */
import {
  EFFECT_COLLECTION,
  buildEffectRecord,
  parseEffectRecord,
  sameDefinition,
} from '../src/effects-contract'
import { shaderLibrary } from '../src/lib/shaders'
import { slugForEffectKey, toEffectDefinition } from '../src/lib/shaders/toEffectDefinition'
import { ShaderType } from '../src/types/shader'
import { envCredentials, fetchCanonEffects, loginFromEnv } from './atp'

const keys = Object.keys(shaderLibrary) as ShaderType[]
const local = keys.map((key) => ({
  key,
  slug: slugForEffectKey(key),
  def: toEffectDefinition(key, shaderLibrary[key]),
}))

let invalidLocal = 0
for (const { key, def } of local) {
  const parsed = parseEffectRecord(buildEffectRecord(def, new Date().toISOString()))
  if (!parsed.ok) {
    invalidLocal++
    console.error(`✗ ${key}:`)
    for (const error of parsed.errors) console.error(`    ${error}`)
  }
}
if (invalidLocal > 0) {
  console.error(`\n${invalidLocal} builtin(s) failed the grammar — nothing published.`)
  process.exit(1)
}

const canon = await fetchCanonEffects()

for (const { slug, def } of local) {
  const published = canon.bySlug.get(slug)
  const status = canon.invalid.some((r) => r.slug === slug)
    ? 'invalid in canon — will rewrite'
    : !published
      ? 'unpublished — will create'
      : sameDefinition(published.def, def)
        ? 'unchanged'
        : 'changed — will update'
  if (status !== 'unchanged') console.log(`  ${slug.padEnd(24)} ${status}`)
}
const toWrite = local.filter(({ slug, def }) => {
  if (canon.invalid.some((r) => r.slug === slug)) return true
  const published = canon.bySlug.get(slug)
  return !published || !sameDefinition(published.def, def)
})

if (toWrite.length === 0) {
  console.log(`All ${local.length} builtins already match canon — nothing to publish.`)
  process.exit(0)
}
console.log(`${toWrite.length} of ${local.length} builtins need publishing.`)

if (!envCredentials()) {
  console.log('\nDry run complete. Set ATP_IDENTIFIER and ATP_APP_PASSWORD to publish (see header).')
  process.exit(0)
}

const agent = await loginFromEnv()
const did = agent.assertDid

for (const { slug, def } of toWrite) {
  // An updated record keeps its original createdAt — republishing an effect
  // does not make it newer than it is. Only a genuinely new record gets now.
  const createdAt = canon.bySlug.get(slug)?.createdAt ?? new Date().toISOString()
  const res = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: EFFECT_COLLECTION,
    rkey: slug,
    record: buildEffectRecord(def, createdAt),
  })
  console.log(`✓ ${res.data.uri}`)
}
console.log(`\nPublished ${toWrite.length} effect(s); ${local.length - toWrite.length} already current.`)
