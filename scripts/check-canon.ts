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
import { sameDefinition } from '../src/effects-contract'
import { shaderLibrary } from '../src/lib/shaders'
import { slugForEffectKey, toEffectDefinition } from '../src/lib/shaders/toEffectDefinition'
import { ShaderType } from '../src/types/shader'
import { fetchCanonEffects } from './atp'

const canon = await fetchCanonEffects()
for (const { slug, errors } of canon.invalid) {
  // Canon holding an invalid record is its own kind of drift.
  console.error(`✗ ${slug}: canon record fails the grammar:`)
  for (const error of errors) console.error(`    ${error}`)
  process.exitCode = 1
}

const keys = Object.keys(shaderLibrary) as ShaderType[]
let drifted = canon.invalid.length
for (const key of keys) {
  const slug = slugForEffectKey(key)
  const localDef = toEffectDefinition(key, shaderLibrary[key])
  const published = canon.bySlug.get(slug)
  canon.bySlug.delete(slug)
  if (!published) {
    drifted++
    console.error(`✗ ${slug}: unpublished — no record in canon (run publish-builtins)`)
    continue
  }
  if (!sameDefinition(localDef, published.def)) {
    drifted++
    console.error(`✗ ${slug}: bundle and canon disagree`)
    for (const field of ['name', 'description', 'env', 'body', 'animatedBy', 'params'] as const) {
      if (JSON.stringify(localDef[field]) !== JSON.stringify(published.def[field])) {
        console.error(
          `    ${field}: repo has ${JSON.stringify(localDef[field])?.slice(0, 60)}, canon has ${JSON.stringify(published.def[field])?.slice(0, 60)}`
        )
      }
    }
  }
}

for (const slug of canon.bySlug.keys()) {
  console.log(`· ${slug}: in canon but not bundled (postdates this build — resolved by fetch)`)
}

if (drifted > 0) {
  console.error(`\n${drifted} divergence(s) between bundle and canon.`)
  process.exit(1)
}
console.log(`All ${keys.length} builtins match canon.`)
