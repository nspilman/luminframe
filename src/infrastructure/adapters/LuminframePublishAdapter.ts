import { Agent, BlobRef } from '@atproto/api'
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
 *      (an animated edit uploads a second blob: its looping MP4)
 *   2. com.luminframe.image      the record carrying the blob(s) + the edit recipe
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

    // The looping clip is an enhancement, never the save itself: a PDS may
    // refuse the upload or the record carrying it (e.g. one still validating
    // against a published schema that predates the `video` field), and the
    // still must save regardless. So its upload failure downgrades to a
    // still-only record instead of failing the save.
    let videoBlob: BlobRef | undefined
    if (input.video) {
      try {
        const videoUpload = await this.agent.uploadBlob(input.video.bytes, {
          encoding: input.video.mimeType,
        })
        videoBlob = videoUpload.data.blob
      } catch (err) {
        console.warn('Video blob upload failed — saving the still alone:', err)
      }
    }

    // 2. Create the Luminframe image record carrying the blob(s) and the
    //    recipe. Same downgrade rule: if the record is rejected with the video
    //    attached, retry once as a still rather than losing the save.
    const create = (withVideo: boolean) =>
      this.agent.com.atproto.repo.createRecord({
        repo: did,
        collection: LUMINFRAME_IMAGE_COLLECTION,
        record: buildLuminframeImageRecord({
          blob: upload.data.blob,
          videoBlob: withVideo ? videoBlob : undefined,
          aspectRatio: input.aspectRatio,
          alt: input.alt,
          title: input.caption,
          effects: input.effects,
          recipe: input.recipe,
          remixOf: input.remixOf,
          createdAt,
        }),
      })

    let result
    try {
      result = await create(videoBlob !== undefined)
    } catch (err) {
      if (videoBlob === undefined) throw err
      console.warn('Record with video was rejected — retrying as a still:', err)
      result = await create(false)
    }

    return { uri: result.data.uri, cid: result.data.cid }
  }
}
