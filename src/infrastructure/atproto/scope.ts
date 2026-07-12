/**
 * The least-privilege OAuth scope Luminframe requests. The app only ever
 * creates the specific records its two publish targets need, so it asks for
 * exactly those collections and nothing more — deliberately NOT
 * `transition:generic`, which is the App-Password equivalent (full read/write
 * across the entire repo).
 *
 *  - `atproto`                                      identity (required base scope)
 *  - `repo:app.bsky.feed.post?action=create`        Bluesky: create image posts
 *  - `repo:social.grain.photo?action=create`        Grain: create the photo…
 *  - `repo:social.grain.gallery?action=create`      …its gallery…
 *  - `repo:social.grain.gallery.item?action=create` …and the join between them
 *  - `repo:com.luminframe.image?action=create`      Luminframe: save an image to the user's PDS
 *  - `blob:image/*`                                 upload image blobs (all targets)
 *  - `rpc:app.bsky.actor.getProfile?aud=…`          read the profile, only to show
 *                                                   the signed-in user's handle
 *
 * Each `repo:` grant is create-only on one collection — never update, delete,
 * or any other record type. Shared by the runtime OAuth client and the
 * build-time client-metadata generator so the requested scope and the declared
 * scope can never drift.
 *
 * Note: adding a collection here widens the requested scope, so sessions
 * authorized before the change won't carry the new grant — a user must
 * re-authenticate once before they can write the newly-added collection.
 *
 * Note: we intentionally do NOT request an identity RPC for resolving
 * @mentions, so caption facet detection is best-effort (see BlueskyPublishAdapter).
 */
export const ATPROTO_OAUTH_SCOPE = [
  'atproto',
  'repo:app.bsky.feed.post?action=create',
  'repo:social.grain.photo?action=create',
  'repo:social.grain.gallery?action=create',
  'repo:social.grain.gallery.item?action=create',
  'repo:com.luminframe.image?action=create',
  'blob:image/*',
  'rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app#bsky_appview',
].join(' ')
