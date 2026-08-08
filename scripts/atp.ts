/**
 * The shared floor under the publish scripts: env-var credentials read one
 * way, and the canon read (luminframe.com's published effect records) that
 * both the drift check and the idempotent publisher diff against.
 */
import { AtpAgent } from '@atproto/api'
import {
  EFFECT_COLLECTION,
  EffectDefinition,
  LUMINFRAME_DID,
  parseEffectRecord,
} from '../src/effects-contract'
import { resolveIdentity } from '../src/infrastructure/atproto/luminframeFeed'

export const service = process.env.PDS_SERVICE || 'https://bsky.social'

/** The env credentials, or null when this is a credential-less (dry) run. */
export function envCredentials(): { identifier: string; password: string } | null {
  const identifier = process.env.ATP_IDENTIFIER
  const password = process.env.ATP_APP_PASSWORD
  return identifier && password ? { identifier, password } : null
}

/** Sign in from the env, or exit with the standard instruction. */
export async function loginFromEnv(): Promise<AtpAgent> {
  const creds = envCredentials()
  if (!creds) {
    console.error('\nSet ATP_IDENTIFIER and ATP_APP_PASSWORD to publish. See this file’s header.')
    process.exit(1)
  }
  const agent = new AtpAgent({ service })
  await agent.login(creds)
  console.log(`Signed in as ${agent.assertDid} on ${service}.`)
  return agent
}

export interface CanonEffect {
  def: EffectDefinition
  /** The record's original timestamp — preserved across republishes so it keeps meaning "created at". */
  createdAt: string
}

/**
 * Every com.luminframe.effect record in canon, by slug — a public read, no
 * auth. Records that fail the grammar come back separately: the drift check
 * reports them, the publisher treats them as needing a rewrite.
 */
export async function fetchCanonEffects(): Promise<{
  bySlug: Map<string, CanonEffect>
  invalid: Array<{ slug: string; errors: string[] }>
}> {
  const { pds } = await resolveIdentity(LUMINFRAME_DID)
  if (!pds) throw new Error(`Could not resolve a PDS for ${LUMINFRAME_DID}`)

  const bySlug = new Map<string, CanonEffect>()
  const invalid: Array<{ slug: string; errors: string[] }> = []
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
        invalid.push({ slug, errors: parsed.errors })
        continue
      }
      const createdAt = (record.value as { createdAt?: string }).createdAt ?? new Date().toISOString()
      bySlug.set(slug, { def: parsed.def, createdAt })
    }
    cursor = page.cursor
  } while (cursor)
  return { bySlug, invalid }
}
