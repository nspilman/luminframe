import { Agent } from '@atproto/api'
import {
  PublishPort,
  PublishImageInput,
  PublishResult,
} from '@/application/ports/PublishPort'
import {
  buildLuminframeImageRecord,
  LUMINFRAME_IMAGE_COLLECTION,
} from './luminframeRecords'

/**
 * Saves the rendered image to the signed-in user's own PDS as a first-class
 * Luminframe record (`com.luminframe.image`) — the app's own lexicon, not a
 * social network's. Constructed with an already-authenticated `Agent`; auth and
 * session lifetime live in the session hook, this only performs the writes.
 *
 * One save writes one record:
 *   1. uploadBlob                → blob ref for the encoded render
 *   2. com.luminframe.image      the record carrying that blob + the edit recipe
 *
 * The `com.luminframe.image` lexicon is published: its schema lives as a
 * `com.atproto.lexicon.schema` record in the authority repo, resolvable via the
 * `_lexicon.luminframe.com` DNS record (see lexicons/com/luminframe/image.json
 * and scripts/publish-lexicon.mjs). So the write uses the PDS's default
 * validation — the server resolves the lexicon and validates the record against
 * it, exactly like a Bluesky post. The pure builder (luminframeRecords.test.ts)
 * still pins the record structure client-side.
 */
export class LuminframePublishAdapter implements PublishPort {
  constructor(private readonly agent: Agent) {}

  async publishImage(input: PublishImageInput): Promise<PublishResult> {
    const did = this.agent.assertDid
    const createdAt = new Date().toISOString()

    // 1. Upload the encoded image to the user's PDS, yielding a blob ref.
    const upload = await this.agent.uploadBlob(input.bytes, {
      encoding: input.mimeType,
    })

    // 2. Create the Luminframe image record carrying the blob and the recipe.
    const result = await this.agent.com.atproto.repo.createRecord({
      repo: did,
      collection: LUMINFRAME_IMAGE_COLLECTION,
      record: buildLuminframeImageRecord({
        blob: upload.data.blob,
        aspectRatio: input.aspectRatio,
        alt: input.alt,
        title: input.caption,
        effects: input.effects,
        recipe: input.recipe,
        remixOf: input.remixOf,
        createdAt,
      }),
    })

    return { uri: result.data.uri, cid: result.data.cid }
  }
}
