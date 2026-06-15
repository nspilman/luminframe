/**
 * The least-privilege OAuth scope Luminframe requests. The app only ever does
 * three things on the user's behalf, so it asks for exactly those and nothing
 * more — deliberately NOT `transition:generic`, which is the App-Password
 * equivalent (full read/write across the entire repo).
 *
 *  - `atproto`                                   identity (required base scope)
 *  - `repo:app.bsky.feed.post?action=create`     create feed posts (not update/
 *                                                delete, not any other collection)
 *  - `blob:image/*`                              upload image blobs (the render)
 *  - `rpc:app.bsky.actor.getProfile?aud=…`       read the profile, only to show
 *                                                the signed-in user's handle
 *
 * Shared by the runtime OAuth client and the build-time client-metadata
 * generator so the requested scope and the declared scope can never drift.
 *
 * Note: we intentionally do NOT request an identity RPC for resolving
 * @mentions, so caption facet detection is best-effort (see BlueskyPublishAdapter).
 */
export const ATPROTO_OAUTH_SCOPE = [
  'atproto',
  'repo:app.bsky.feed.post?action=create',
  'blob:image/*',
  'rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app#bsky_appview',
].join(' ')
