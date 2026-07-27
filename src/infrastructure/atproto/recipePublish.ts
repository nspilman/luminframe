import { Agent } from '@atproto/api'
import { RECIPE_COLLECTION, RecipeDefinition, buildRecipeRecord } from '@/effects-contract'

/**
 * Publish (or republish) a Look to the signed-in user's repo. The rkey is the
 * author's slug and putRecord is idempotent, so publishing the same slug
 * again updates the record in place — the same semantics as putEffectRecord.
 */
export async function putRecipeRecord(
  agent: Agent,
  slug: string,
  def: RecipeDefinition,
  createdAt: string = new Date().toISOString()
): Promise<{ uri: string }> {
  const res = await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: RECIPE_COLLECTION,
    rkey: slug,
    record: buildRecipeRecord(def, createdAt),
  })
  return { uri: res.data.uri }
}
