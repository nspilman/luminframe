/**
 * Decide whether a thrown error means the user's OAuth session is no longer
 * usable (expired, revoked, or refresh failed) — as opposed to a transient
 * network or validation problem. This client version has no session-deleted
 * event, so a write failure is the first moment we learn a session died; this
 * is the signal to drop back to signed-out and re-prompt sign-in.
 *
 * Tolerant by design: the failure can arrive as an OAuth token error (thrown by
 * the client before the request), an HTTP 401 from the PDS, or an XRPC error
 * code — we match any of them rather than couple to one SDK shape.
 */
export function isSessionExpiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; status?: number; message?: string; error?: string }

  if (e.name && /Token(Refresh|Revoked|Invalid)Error/.test(e.name)) return true
  if (e.status === 401) return true

  const text = `${e.error ?? ''} ${e.message ?? ''}`
  return /expired|invalid[_ ]?token|revoked|unauthorized/i.test(text)
}
