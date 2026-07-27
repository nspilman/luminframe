import { Agent } from '@atproto/api'
import { EFFECT_COLLECTION, EffectDefinition, buildEffectRecord } from '@/effects-contract'

/**
 * Publish (or republish) a custom shader effect to the signed-in user's repo.
 * The rkey is the author's slug and putRecord is idempotent, so publishing
 * the same slug again updates the record in place — identical semantics to
 * scripts/publish-effect.ts, which writes the same record from the terminal.
 */
export async function putEffectRecord(
  agent: Agent,
  slug: string,
  def: EffectDefinition,
  createdAt: string = new Date().toISOString()
): Promise<{ uri: string }> {
  const res = await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: EFFECT_COLLECTION,
    rkey: slug,
    record: buildEffectRecord(def, createdAt),
  })
  return { uri: res.data.uri }
}
