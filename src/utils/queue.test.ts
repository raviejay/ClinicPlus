import { describe, expect, it } from 'vitest'
import { waitLabel, waitMinutes, waitTone } from './queue'

const now = new Date('2026-10-16T10:00:00Z')

describe('waiting time', () => {
  it('counts whole minutes since the queue entry (database times have no zone, they are UTC)', () => {
    expect(waitMinutes('2026-10-16T09:48:30', now)).toBe(11)
    expect(waitMinutes('2026-10-16T09:48:30Z', now)).toBe(11)
  })
  it('is zero for a missing, invalid or future time', () => {
    expect(waitMinutes(null, now)).toBe(0)
    expect(waitMinutes('nonsense', now)).toBe(0)
    expect(waitMinutes('2026-10-16T10:05:00', now)).toBe(0)
  })
  it('reads naturally', () => {
    expect(waitLabel(0)).toBe('Just now')
    expect(waitLabel(12)).toBe('12 min')
    expect(waitLabel(60)).toBe('1 h')
    expect(waitLabel(65)).toBe('1 h 5 min')
  })
  it('flags long waits', () => {
    expect(waitTone(5)).toBe('ok')
    expect(waitTone(20)).toBe('long')
    expect(waitTone(45)).toBe('very-long')
  })
})
