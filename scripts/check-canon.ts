#!/usr/bin/env npx tsx
/**
 * Verify the bundled effect library against canon — the com.luminframe.effect
 * records in luminframe.com's repo. The records are the source of truth (the
 * atmosphere's rule: data lives in repos; apps are views); the bundle is a
 * build-time snapshot of that repo, and a snapshot that can drift silently is
 * a fork, not a cache. This makes drift loud.
 *
 * Public reads only — no credentials. Exit 0 when every builtin matches its
 * record; exit 1 when anything drifted, naming each divergence:
 *
 *   repo ahead    the code changed and wasn't republished → run publish-builtins
 *   canon ahead   the record changed outside this repo    → pull it into code
 *   unpublished   a builtin has no record at all          → run publish-builtins
 *
 * Records in canon with no bundled counterpart are listed, not failed — canon
 * may carry effects that postdate this build, and the app already resolves
 * those by fetch.
 */
import { parseEffectRecord, EffectDefinition } from '../src/effects-contract'
import { shaderLibrary } from '../src/lib/shaders'
import {
  LUMINFRAME_DID,
  slugForEffectKey,
  toEffectDefinition,
} from '../src/lib/shaders/toEffectDefinition'
import { ShaderType } from '../src/types/shader'

const PLC_DIRECTORY = 'https://plc.directory'
const EFFECT_COLLECTION = 'com.luminframe.effect'

/** Stable form for comparison — key order must not count as a difference. */
function canonical(def: EffectDefinition): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v as object)
              .sort()
              .map((k) => [k, sort((v as Record<string, unknown>)[k])])
          )
        : v
  return JSON.stringify(sort(def))
}

const didDoc = (await (await fetch(`${PLC_DIRECTORY}/${LUMINFRAME_DID}`)).json()) as {
  service?: { id: string; serviceEndpoint?: string }[]
}
const pds = didDoc.service?.find((s) => s.id.endsWith('atproto_pds'))?.serviceEndpoint
if (!pds) {
  console.error(`Could not resolve a PDS for ${LUMINFRAME_DID}`)
  process.exit(1)
}

const canonBySlug = new Map<string, EffectDefinition>()
let cursor: string | undefined
do {
  const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`)
  url.searchParams.set('repo', LUMINFRAME_DID)
  url.searchParams.set('collection', EFFECT_COLLECTION)
  url.searchParams.set('limit', '100')
  if (cursor) url.searchParams.set('cursor', cursor)
  const page = (await (await fetch(url)).json()) as {
    records?: { uri: string; value: unknown }[]
    cursor?: string
  }
  for (const record of page.records ?? []) {
    const slug = record.uri.split('/').pop()!
    const parsed = parseEffectRecord(record.value)
    if (!parsed.ok) {
      // Canon holding an invalid record is its own kind of drift — report it
      // as a divergence rather than skipping past it.
      console.error(`✗ ${slug}: canon record fails the grammar:`)
      for (const error of parsed.errors) console.error(`    ${error}`)
      process.exitCode = 1
      continue
    }
    canonBySlug.set(slug, parsed.def)
  }
  cursor = page.cursor
} while (cursor)

const keys = Object.keys(shaderLibrary) as ShaderType[]
let drifted = 0
for (const key of keys) {
  const slug = slugForEffectKey(key)
  const local = toEffectDefinition(key, shaderLibrary[key])
  const canon = canonBySlug.get(slug)
  canonBySlug.delete(slug)
  if (!canon) {
    drifted++
    console.error(`✗ ${slug}: unpublished — no record in canon (run publish-builtins)`)
    continue
  }
  if (canonical(local) !== canonical(canon)) {
    drifted++
    console.error(`✗ ${slug}: bundle and canon disagree`)
    // Name the fields, so the direction of the drift is readable.
    for (const field of ['name', 'description', 'env', 'body', 'animatedBy'] as const) {
      if (JSON.stringify(local[field]) !== JSON.stringify(canon[field])) {
        console.error(`    ${field}: repo has ${JSON.stringify(local[field])?.slice(0, 60)}, canon has ${JSON.stringify(canon[field])?.slice(0, 60)}`)
      }
    }
    if (canonical({ ...local, params: [] } as EffectDefinition) === canonical({ ...canon, params: [] } as EffectDefinition)) {
      console.error('    params differ')
    }
  }
}

for (const slug of canonBySlug.keys()) {
  console.log(`· ${slug}: in canon but not bundled (postdates this build — resolved by fetch)`)
}

if (drifted > 0) {
  console.error(`\n${drifted} of ${keys.length} builtins drifted from canon.`)
  process.exit(1)
}
console.log(`All ${keys.length} builtins match canon (${LUMINFRAME_DID} on ${pds}).`)
