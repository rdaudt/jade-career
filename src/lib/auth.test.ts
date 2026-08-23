import { describe, it, expect, beforeEach } from 'vitest'
import { verifySession, makeSessionValue } from './auth'

describe('auth', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret'
  })

  it('verifies a session value produced by makeSessionValue', () => {
    const value = makeSessionValue()
    expect(verifySession(value)).toBe(true)
  })

  it('rejects an undefined or tampered session value', () => {
    expect(verifySession(undefined)).toBe(false)
    expect(verifySession('garbage')).toBe(false)
  })
})
