import { describe, expect, it } from 'vitest'
import { checkPassword, friendlyAuthError, isEmail, lockoutSeconds } from './auth'

describe('friendly auth errors', () => {
  it('explains a wrong password without saying which half was wrong', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/email and password do not match/)
  })
  it('explains rate limits, captcha, duplicates and network problems', () => {
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/Too many attempts/)
    expect(friendlyAuthError('captcha verification process failed')).toMatch(/verify that you are human/)
    expect(friendlyAuthError('User already registered')).toMatch(/already exists/)
    expect(friendlyAuthError('Failed to fetch')).toMatch(/internet connection/)
    expect(friendlyAuthError('New password should be different from the old password.')).toMatch(/not used before/)
  })
  it('passes unknown messages through and handles empty ones', () => {
    expect(friendlyAuthError('Some odd server message')).toBe('Some odd server message')
    expect(friendlyAuthError(null)).toMatch(/Something went wrong/)
  })
})

describe('login pause after repeated failures', () => {
  it('lets the first few attempts through', () => {
    for (const n of [0, 1, 4]) expect(lockoutSeconds(n)).toBe(0)
  })
  it('pauses for longer each time, up to five minutes', () => {
    expect([5, 6, 7, 8, 9, 50].map(lockoutSeconds)).toEqual([30, 60, 120, 300, 300, 300])
  })
})

describe('password check', () => {
  it('says nothing for an empty password', () => expect(checkPassword('')).toEqual({ score: 0, label: '', ok: false }))
  it('rejects short and obvious passwords', () => {
    expect(checkPassword('abc12').ok).toBe(false)
    expect(checkPassword('aaaaaaaa').ok).toBe(false)
    expect(checkPassword('Password').ok).toBe(false) // a very common password, whatever the capitals
    expect(checkPassword('password').ok).toBe(false)
    expect(checkPassword('12345678').ok).toBe(false)
  })
  it('scores by length and variety', () => {
    expect(checkPassword('clinicgo').score).toBe(2)
    expect(checkPassword('Clinic2026').score).toBe(3)
    expect(checkPassword('Clinic-Go-2026!').score).toBe(4)
  })
})

describe('email check', () => {
  it('accepts normal addresses and rejects obvious mistakes', () => {
    expect(isEmail(' juan@clinic.ph ')).toBe(true)
    for (const bad of ['', 'juan', 'juan@', '@clinic.ph', 'juan@clinic', 'ju an@clinic.ph']) expect(isEmail(bad)).toBe(false)
  })
})
