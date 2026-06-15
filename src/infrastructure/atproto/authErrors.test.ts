import { isSessionExpiredError } from './authErrors'

describe('isSessionExpiredError', () => {
  it('flags an OAuth token-refresh error by name', () => {
    expect(isSessionExpiredError({ name: 'TokenRefreshError', message: 'failed' })).toBe(true)
  })

  it('flags a 401 status from the PDS', () => {
    expect(isSessionExpiredError({ status: 401, message: 'Unauthorized' })).toBe(true)
  })

  it('flags an expired-token message', () => {
    expect(isSessionExpiredError({ error: 'ExpiredToken', message: 'Token has expired' })).toBe(true)
  })

  it('does not flag an ordinary network error', () => {
    expect(isSessionExpiredError(new TypeError('Failed to fetch'))).toBe(false)
  })

  it('does not flag a non-object', () => {
    expect(isSessionExpiredError('nope')).toBe(false)
  })
})
