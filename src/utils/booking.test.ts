import { describe, expect, it } from 'vitest'
import {
  addDays, BOOKING_SLOTS, bookingReference, buildIcs, daysBetween, isValidEmail, isValidPhone,
  manilaToday, openingHoursLabel, slotLoadLabel, slotMinutes,
  bookingLocation, directionsUrl, mapEmbedUrl, monthLabel, monthMatrix, shiftMonth, telUrl,
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

describe('monthMatrix', () => {
  it('lays a month out in weeks starting on Sunday, padding with null', () => {
    const weeks = monthMatrix(2026, 10) // October 1, 2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(weeks[weeks.length - 1].filter(Boolean).pop()).toBe('2026-10-31')
    expect(weeks.every(w => w.length === 7)).toBe(true)
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
  })
  it('handles a month that starts on Sunday and leap-year February', () => {
    expect(monthMatrix(2026, 2)[0][0]).toBe('2026-02-01') // Feb 1, 2026 is a Sunday
    expect(monthMatrix(2028, 2).flat().filter(Boolean)).toHaveLength(29)
    expect(monthMatrix(2026, 2).flat().filter(Boolean)).toHaveLength(28)
  })
  it('labels months', () => {
    expect(monthLabel(2026, 10)).toBe('October 2026')
  })
  it('moves between months across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth(2026, 10, 14)).toEqual({ year: 2027, month: 12 })
    expect(shiftMonth(2026, 10, 0)).toEqual({ year: 2026, month: 10 })
  })
})

describe('bookingLocation', () => {
  const clinic = { name: 'Sunrise Clinic', address: ' 123 Rizal St, QC ', phone: '(02) 8123 4567' }
  it('uses the clinic address and phone', () => {
    expect(bookingLocation(clinic, null)).toEqual({
      name: 'Sunrise Clinic', address: '123 Rizal St, QC', phone: '(02) 8123 4567',
      mapQuery: 'Sunrise Clinic, 123 Rizal St, QC', hasAddress: true,
    })
  })
  it("prefers the branch's address and phone, and names the branch", () => {
    const loc = bookingLocation(clinic, { name: 'North', address: 'Commonwealth Ave', contact_number: '0917 111 2222' })
    expect(loc.name).toBe('Sunrise Clinic — North')
    expect(loc.address).toBe('Commonwealth Ave')
    expect(loc.phone).toBe('0917 111 2222')
  })
  it("falls back to the clinic when a branch has none", () => {
    const loc = bookingLocation(clinic, { name: 'North', address: null, contact_number: '' })
    expect(loc.address).toBe('123 Rizal St, QC')
  })
  it('points the map at the pinned spot when the clinic has one', () => {
    const loc = bookingLocation({ ...clinic, latitude: 14.5995, longitude: 120.9842 }, null)
    expect(loc.mapQuery).toBe('14.5995,120.9842')
    expect(loc.address).toBe('123 Rizal St, QC')
  })
  it('treats a pin alone as a location even without an address', () => {
    const loc = bookingLocation({ name: 'Sunrise Clinic', latitude: 14.5, longitude: 121 }, null)
    expect(loc.hasAddress).toBe(true)
    expect(loc.mapQuery).toBe('14.5,121')
  })
  it("uses a branch's own address instead of the clinic's pin", () => {
    const loc = bookingLocation({ ...clinic, latitude: 14.5995, longitude: 120.9842 }, { name: 'North', address: 'Commonwealth Ave' })
    expect(loc.mapQuery).toBe('Sunrise Clinic, Commonwealth Ave')
  })
  it('searches by the clinic name when there is no address at all', () => {
    const loc = bookingLocation({ name: 'Sunrise Clinic' }, null)
    expect(loc.hasAddress).toBe(false)
    expect(loc.mapQuery).toBe('Sunrise Clinic, Philippines')
  })
})

describe('map links', () => {
  it('encodes the search for the embedded map and for directions', () => {
    expect(mapEmbedUrl('A & B, 5th St')).toBe('https://maps.google.com/maps?q=A%20%26%20B%2C%205th%20St&output=embed&z=16')
    expect(directionsUrl('A & B')).toBe('https://www.google.com/maps/dir/?api=1&destination=A%20%26%20B')
  })
  it('makes a tap-to-call link from a formatted number', () => {
    expect(telUrl('(02) 8123-4567')).toBe('tel:0281234567')
    expect(telUrl('+63 917 123 4567')).toBe('tel:+639171234567')
  })
})
