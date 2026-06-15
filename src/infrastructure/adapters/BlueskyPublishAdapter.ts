import { Agent, AppBskyFeedPost, RichText } from '@atproto/api'
import {
  PublishPort,
  PublishImageInput,
  PublishResult,
} from '@/application/ports/PublishPort'
import { buildImagePostRecord } from './blueskyPostRecord'

/**
 * Publishes an image to Bluesky as an `app.bsky.feed.post`, on behalf of the
 * signed-in user. Constructed with an already-authenticated `Agent` (from the
 * OAuth session) — auth and session lifetime live in the session hook, this
 * only performs the write.
 *
 * The flow is the standard atproto two-step: upload the bytes as a blob to the
 * user's PDS, then create a record that references the returned blob CID.
 */
export class BlueskyPublishAdapter implements PublishPort {
  constructor(private readonly agent: Agent) {}

  async publishImage(input: PublishImageInput): Promise<PublishResult> {
    // 1. Upload the encoded image to the user's PDS, yielding a blob ref.
    const upload = await this.agent.uploadBlob(input.bytes, {
      encoding: input.mimeType,
    })

    // 2. Resolve rich-text facets (mentions, links, tags) in the caption so
    //    they render as live links rather than plain text.
    const richText = new RichText({ text: input.caption ?? '' })
    await richText.detectFacets(this.agent)

    // 3. Assemble the record and refuse to write it if it doesn't validate —
    //    a malformed record can be silently dropped or break downstream views.
    const record = buildImagePostRecord({
      blob: upload.data.blob,
      alt: input.alt,
      text: richText.text,
      facets: richText.facets,
      aspectRatio: input.aspectRatio,
      createdAt: new Date().toISOString(),
    })
    const validation = AppBskyFeedPost.validateRecord(record)
    if (!validation.success) {
      throw new Error(
        `Refusing to publish an invalid post record: ${validation.error}`
      )
    }

    // 4. Write the record to the user's repo. Omitting rkey lets the server
    //    assign a TID.
    const res = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.assertDid,
      collection: 'app.bsky.feed.post',
      record,
    })
    return { uri: res.data.uri, cid: res.data.cid }
  }
}
