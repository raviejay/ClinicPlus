import { describe, expect, it } from 'vitest'
import {
  addDays, BOOKING_SLOTS, bookingReference, buildIcs, daysBetween, isValidEmail, isValidPhone,
  manilaToday, openingHoursLabel, slotLoadLabel, slotMinutes,
} from './booking'

describe('slotMinutes', () => {
  it('parses 12-hour labels, including noon and midnight', () => {
    expect(slotMinutes('9:00 AM')).toBe(540)
    expect(slotMinutes('12:00 PM')).toBe(720)
    expect(slotMinutes('12:00 AM')).toBe(0)
    expect(slotMinutes('1:30 PM')).toBe(810)
  })
  it('returns null for free text', () => {
    expect(slotMinutes('whenever')).toBeNull()
  })
})

describe('slots', () => {
  it('are split into morning and afternoon', () => {
    expect(BOOKING_SLOTS.filter(s => s.period === 'morning').map(s => s.label))
      .toEqual(['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'])
    expect(BOOKING_SLOTS.filter(s => s.period === 'afternoon')).toHaveLength(4)
  })
  it('derive the opening hours label', () => {
    expect(openingHoursLabel()).toBe('8:00 AM – 5:00 PM')
  })
})

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('counts days between dates', () => {
    expect(daysBetween('2026-10-11', '2026-10-18')).toBe(7)
    expect(daysBetween('2026-10-11', '2026-10-11')).toBe(0)
  })
  it('gives today as an ISO date', () => {
    expect(manilaToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('validation', () => {
  it('accepts Philippine and international phone formats', () => {
    expect(isValidPhone('0917 123 4567')).toBe(true)
    expect(isValidPhone('+63 917 123 4567')).toBe(true)
    expect(isValidPhone('(02) 8123-4567')).toBe(true)
  })
  it('rejects things that are not phone numbers', () => {
    expect(isValidPhone('abc')).toBe(false)
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
  it('checks email shape', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
  })
})

describe('slotLoadLabel', () => {
  it('says how many are booked', () => {
    expect(slotLoadLabel(1, false)).toBe('1 booked')
    expect(slotLoadLabel(3, false)).toBe('3 booked')
  })
  it('calls out a busy doctor', () => {
    expect(slotLoadLabel(2, true)).toBe('Doctor busy')
  })
})

describe('bookingReference', () => {
  it('is the first 8 characters of the id, uppercased', () => {
    expect(bookingReference('abcd1234-5678-90ab-cdef-1234567890ab')).toBe('ABCD1234')
  })
})

describe('buildIcs', () => {
  const base = { uid: 'u1', title: 'Check-up, Demo', description: 'Ref; 1', location: 'Demo Clinic', date: '2026-10-15' }

  it('converts Manila time (UTC+8) to UTC', () => {
    const ics = buildIcs({ ...base, slot: '9:00 AM' })
    expect(ics).toContain('DTSTART:20261015T010000Z')
    expect(ics).toContain('DTEND:20261015T013000Z')
    expect(buildIcs({ ...base, slot: '1:00 PM' })).toContain('DTSTART:20261015T050000Z')
  })
  it('rolls back to the previous UTC day for early-morning slots', () => {
    expect(buildIcs({ ...base, slot: '12:00 AM' })).toContain('DTSTART:20261014T160000Z')
  })
  it('escapes commas and semicolons and uses CRLF line endings', () => {
    const ics = buildIcs({ ...base, slot: '9:00 AM' })
    expect(ics).toContain('SUMMARY:Check-up\\, Demo')
    expect(ics).toContain('DESCRIPTION:Ref\\; 1')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
  })
})
