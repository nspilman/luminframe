import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

/** Whatever `init()` resolves to — pinned to the lib so we don't hand-mirror its union. */
export type OAuthInitResult = Awaited<ReturnType<BrowserOAuthClient['init']>>

/**
 * Publishing to Bluesky writes a record to the user's repo, which needs write
 * access. The mandatory `atproto` scope alone is read-only, so we also request
 * the broad `transition:generic` scope (the OAuth equivalent of an App
 * Password's reach). The default loopback client only grants `atproto`, so in
 * dev we hand-build a loopback client_id that carries this scope.
 */
const WRITE_SCOPE = 'atproto transition:generic'

/**
 * Handles can't be resolved via DNS from the browser, so the client needs an
 * XRPC resolver service. `bsky.social` works but leaks the handle + IP to
 * Bluesky — an acceptable tradeoff for a Bluesky-publishing feature. Point this
 * at a self-run PDS/resolver if that privacy cost ever matters.
 */
const HANDLE_RESOLVER = 'https://bsky.social'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function isLoopbackOrigin(location: Location): boolean {
  return LOOPBACK_HOSTS.has(location.hostname)
}

/**
 * Build a loopback client_id that encodes our write scope. Two origins are in
 * play and they are deliberately different: the client_id's origin must be
 * `http://localhost` (atproto OAuth servers special-case it so no hosted
 * metadata is needed), while the redirect_uri must be the *actual* origin the
 * browser returns to — which for loopback must be an IP (`127.0.0.1`), never
 * `localhost`. The lib navigates the app to the IP origin to match.
 */
function buildLoopbackClientId(location: Location): string {
  const host = location.hostname === 'localhost' ? '127.0.0.1' : location.hostname
  const redirectUri = `http://${host}${location.port ? `:${location.port}` : ''}/`
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    scope: WRITE_SCOPE,
  })
  return `http://localhost?${params.toString()}`
}

let clientPromise: Promise<BrowserOAuthClient> | null = null

/**
 * The app's single OAuth client, created once and reused. In dev it's a
 * loopback client (no hosted metadata required); in production it loads the
 * metadata document served at `/client-metadata.json` on the app's own origin.
 */
export function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (clientPromise) return clientPromise
  const clientId = isLoopbackOrigin(window.location)
    ? buildLoopbackClientId(window.location)
    : `${window.location.origin}/client-metadata.json`
  clientPromise = BrowserOAuthClient.load({
    clientId,
    handleResolver: HANDLE_RESOLVER,
  })
  return clientPromise
}

let initPromise: Promise<OAuthInitResult> | null = null

/**
 * Run the client's one-time initialization. `init()` both consumes an OAuth
 * redirect (if the page was just navigated back from the auth server) and
 * restores the last active session — and the docs require it run exactly once
 * per page load. We memoize it so React StrictMode's double-invoke (and any
 * remount) can't trigger a second, conflicting init.
 */
export function initOAuth(): Promise<OAuthInitResult> {
  if (initPromise) return initPromise
  initPromise = getOAuthClient().then((client) => client.init())
  return initPromise
}
