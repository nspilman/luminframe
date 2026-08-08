#!/usr/bin/env npx tsx
/**
 * Repair published com.luminframe.image records whose recipes name draft://
 * effects — pointers into the author's own localStorage, dangling for every
 * other viewer since the day they were published. Each draft:// key is
 * rewritten to the at:// URI of the same effect published in the author's
 * repo (which must exist first — publish the effect, then run this).
 *
 * Run it as the records' owner. Without --apply it is a dry run: it lists
 * every record that would change and exactly how, and writes nothing.
 *
 * Env:
 *   ATP_IDENTIFIER   handle or DID to log in as (the records' owner)
 *   ATP_APP_PASSWORD an app password (NOT the main password)
 *   PDS_SERVICE      optional, defaults to https://bsky.social
 *
 * Usage:
 *   npx tsx scripts/repair-recipes.ts           # dry run
 *   npx tsx scripts/repair-recipes.ts --apply   # rewrite the records
 */
import { AtpAgent } from '@atproto/api'

const IMAGE_COLLECTION = 'com.luminframe.image'
const EFFECT_COLLECTION = 'com.luminframe.effect'

const apply = process.argv.includes('--apply')

const service = process.env.PDS_SERVICE || 'https://bsky.social'
const identifier = process.env.ATP_IDENTIFIER
const password = process.env.ATP_APP_PASSWORD
if (!identifier || !password) {
  console.error('Set ATP_IDENTIFIER and ATP_APP_PASSWORD (the records’ owner). See this file’s header.')
  process.exit(1)
}

const agent = new AtpAgent({ service })
await agent.login({ identifier, password })
const did = agent.assertDid
console.log(`Signed in as ${did} on ${service}.${apply ? '' : ' (dry run — pass --apply to write)'}`)

/** draft://<slug> → the same slug published in the owner's own repo. */
const repairedKey = (key: string): string =>
  key.startsWith('draft://')
    ? `at://${did}/${EFFECT_COLLECTION}/${key.slice('draft://'.length)}`
    : key

// The published effects the rewrites will point at — refuse to write a URI
// that doesn't resolve, or the repair would just mint fresh dangling keys.
const published = await agent.com.atproto.repo.listRecords({
  repo: did,
  collection: EFFECT_COLLECTION,
  limit: 100,
})
const publishedUris = new Set(published.data.records.map((r) => r.uri))

const res = await agent.com.atproto.repo.listRecords({
  repo: did,
  collection: IMAGE_COLLECTION,
  limit: 100,
})

let changed = 0
let blocked = 0
for (const { uri, value } of res.data.records) {
  const record = value as {
    effects?: string[]
    recipe?: { type: string; params?: Record<string, unknown> }[]
  }
  const draftKeys = [
    ...(record.effects ?? []),
    ...(record.recipe ?? []).map((s) => s.type),
  ].filter((k) => k.startsWith('draft://'))
  if (draftKeys.length === 0) continue

  const rewrites = [...new Set(draftKeys)].map((k) => ({ from: k, to: repairedKey(k) }))
  const missing = rewrites.filter((r) => !publishedUris.has(r.to))
  console.log(`\n${uri}`)
  for (const { from, to } of rewrites) {
    const ok = publishedUris.has(to)
    console.log(`  ${from} → ${to}${ok ? '' : '  ✗ NOT PUBLISHED — publish this effect first'}`)
  }
  if (missing.length > 0) {
    blocked++
    continue
  }

  changed++
  if (!apply) continue

  const rkey = uri.split('/').pop()!
  const repaired = {
    ...record,
    ...(record.effects ? { effects: record.effects.map(repairedKey) } : {}),
    ...(record.recipe
      ? { recipe: record.recipe.map((s) => ({ ...s, type: repairedKey(s.type) })) }
      : {}),
  }
  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: IMAGE_COLLECTION,
    rkey,
    record: repaired,
  })
  console.log('  ✓ rewritten')
}

console.log(
  `\n${changed} record(s) ${apply ? 'rewritten' : 'would change'}${blocked ? `; ${blocked} blocked on unpublished effects` : ''}.`
)
