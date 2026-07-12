/**
 * Shared AT Protocol data shapes — dependency-free so any layer can name them
 * without pulling in the SDK.
 */

/**
 * An immutable pointer to another record (com.atproto.repo.strongRef): its AT-URI
 * plus the CID of the exact revision. Used wherever one record references another —
 * e.g. remix lineage.
 */
export interface StrongRef {
  uri: string
  cid: string
}
