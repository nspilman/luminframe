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
 * The `com.luminframe.image` lexicon is not published (no `_lexicon` DNS record /
 * schema doc), so we pass `validate: false`: a PDS that tries to resolve the
 * lexicon to validate the record would otherwise reject a write it can't verify.
 * `validate: false` stores the record as-is. The pure builder pins the record
 * structure (luminframeRecords.test.ts); the remaining guarantee is that the
 * record is well-formed, which the builder ensures. Publishing the schema later
 * would let this flip to server-side validation and make the records
 * discoverable/validatable by other apps.
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
        createdAt,
      }),
      // Our lexicon is unpublished, so the PDS cannot resolve it to validate.
      validate: false,
    })

    return { uri: result.data.uri, cid: result.data.cid }
  }
}
