import { Agent } from '@atproto/api'
import {
  PublishPort,
  PublishImageInput,
  PublishResult,
} from '@/application/ports/PublishPort'
import {
  buildGrainPhotoRecord,
  buildGrainGalleryRecord,
  buildGrainItemRecord,
  deriveGalleryTitle,
} from './grainRecords'
import { appendAttribution } from './blueskyAttribution'

/**
 * Publishes an image to Grain (grain.social) on behalf of the signed-in user.
 * Constructed with an already-authenticated `Agent` (from the OAuth session) —
 * auth and session lifetime live in the session hook; this only performs the
 * writes.
 *
 * Grain is gallery-centric: a photo cannot stand alone, so one publish writes
 * THREE records to the user's PDS, in order, each referencing the last:
 *
 *   1. uploadBlob                  → blob ref for the encoded render
 *   2. social.grain.photo          the photo, carrying that blob   → photo AT-URI
 *   3. social.grain.gallery        a fresh single-photo gallery     → gallery AT-URI
 *   4. social.grain.gallery.item   joins gallery ⇄ photo
 *
 * Mapping from the generic publish input:
 *   - input.alt      → photo.alt (accessibility)
 *   - input.caption  → gallery.title (short label) + gallery.description (full
 *                      caption + the Luminframe attribution backlink)
 *
 * The meaningful "post" is the gallery, so its URI/CID is what we return.
 *
 * Unlike the Bluesky adapter we don't run `validateRecord` here: Grain's
 * lexicons aren't in `@atproto/api`, and validating them would mean vendoring
 * the whole transitive `$ref` closure. The pure builders pin the record
 * structure (tested in grainRecords.test.ts) and `deriveGalleryTitle` guarantees
 * the one length-bounded field, so the remaining validation is the PDS's own.
 */
export class GrainPublishAdapter implements PublishPort {
  constructor(private readonly agent: Agent) {}

  async publishImage(input: PublishImageInput): Promise<PublishResult> {
    const did = this.agent.assertDid
    const createdAt = new Date().toISOString()

    // 1. Upload the encoded image to the user's PDS, yielding a blob ref.
    const upload = await this.agent.uploadBlob(input.bytes, {
      encoding: input.mimeType,
    })

    // 2. Create the photo record that carries the blob.
    const photo = await this.agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'social.grain.photo',
      record: buildGrainPhotoRecord({
        blob: upload.data.blob,
        aspectRatio: input.aspectRatio,
        alt: input.alt,
        createdAt,
      }),
    })

    // 3. Create the gallery. The caption becomes a short title plus a full
    //    description carrying the attribution backlink (a #link facet over
    //    "luminframe.com"), the same annotation Grain renders for descriptions.
    const caption = (input.caption ?? '').trim()
    const { text, facet } = appendAttribution(caption)
    const gallery = await this.agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'social.grain.gallery',
      record: buildGrainGalleryRecord({
        title: deriveGalleryTitle(caption),
        description: text,
        facets: [facet],
        createdAt,
      }),
    })

    // 4. Join the photo into the gallery. Both AT-URIs already exist, so this
    //    record is what actually makes the photo appear on Grain.
    await this.agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'social.grain.gallery.item',
      record: buildGrainItemRecord({
        gallery: gallery.data.uri,
        item: photo.data.uri,
        createdAt,
      }),
    })

    return { uri: gallery.data.uri, cid: gallery.data.cid }
  }
}
