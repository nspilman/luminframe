import { StrongRef } from '@/types/atproto'
import { RecipeStep } from '@/types/recipe'

/**
 * Everything needed to publish one processed image, expressed without any
 * network/SDK detail. Keeps the application boundary clean: callers hand over
 * bytes + metadata, adapters decide how to get them into a given network.
 */
export interface PublishImageInput {
  /** Encoded image bytes, already sized and stripped, ready to upload. */
  bytes: Uint8Array
  /** MIME type of the bytes, e.g. `image/jpeg`. */
  mimeType: string
  /** Accessibility description of the image. */
  alt: string
  /** Optional caption / post text. */
  caption?: string
  /** Pixel dimensions, surfaced to clients as the embed's aspect-ratio hint. */
  aspectRatio: { width: number; height: number }
  /**
   * The effect keys applied to produce this image, in order — the edit recipe.
   * Optional: only targets with a place to record it (Luminframe's own lexicon)
   * use it; the social targets ignore it.
   */
  effects?: readonly string[]
  /**
   * The executable effect stack with parameters (already serialized to plain
   * JSON). Luminframe's own record stores it; the social targets ignore it.
   */
  recipe?: readonly RecipeStep[]
  /** The record this image was remixed from, if any — its lineage. */
  remixOf?: StrongRef
}

export interface PublishResult {
  /** AT URI of the created record. */
  uri: string
  cid: string
}

/**
 * A destination an image can be published to. Today this is Bluesky; Grain (and
 * anything else) slots in as another adapter behind the same method.
 */
export interface PublishPort {
  publishImage(input: PublishImageInput): Promise<PublishResult>
}
