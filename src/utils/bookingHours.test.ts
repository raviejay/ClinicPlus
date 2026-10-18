import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addClosedDate, DAY_KEYS, defaultBookingHours, dropPastDates, firstOpenDay, hasProblems, hoursLines, hoursSummary,
  displayTime, isOpenOn, isValidLength, lengthFor, minutesLabel, nextOpenDay, rangeLabel, normalizeBookingHours, removeClosedDate, slotsFor, timeLabel,
  validateBookingHours, type BookingHours, type DayKey,
} from './bookingHours'

// The same cases the database tests use, so the booking page and the database agree on every slot
const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), 'supabase/tests/fixtures/booking-hours-cases.json'), 'utf8'),
) as {
  defaultSlots: string[]
  cases: { name: string; date: string; spec: any; expected: string[] }[]
}

const expand = (spec: any): BookingHours => ({
  slot_minutes: spec.slot_minutes,
  closed_dates: spec.closed_dates,
  days: Object.fromEntries(DAY_KEYS.map(d => [d, { ...spec.day, ...(spec.overrides[d] ?? {}) }])) as BookingHours['days'],
})
const labels = (h: BookingHours, iso: string) => slotsFor(h, iso).map(s => s.label)

describe('slots: agree with the database', () => {
  it('the default schedule is what clinics had before', () => {
    expect(labels(defaultBookingHours(), '2026-10-19')).toEqual(fixtures.defaultSlots)
    expect(labels(defaultBookingHours(), '2026-10-18')).toEqual(fixtures.defaultSlots) // a Sunday
  })
  for (const c of fixtures.cases) {
    it(c.name, () => expect(labels(expand(c.spec), c.date)).toEqual(c.expected))
  }
})

describe('slots: details', () => {
  it('knows morning from afternoon, and the minutes', () => {
    const slots = slotsFor(defaultBookingHours(), '2026-10-19')
    expect(slots[0]).toEqual({ label: '8:00 AM', minutes: 480, end: 540, period: 'morning' })
    expect(slots[4]).toEqual({ label: '1:00 PM', minutes: 780, end: 840, period: 'afternoon' })
  })
  it('offers nothing on a closed day or date', () => {
    const h = defaultBookingHours()
    h.days.sun.open = false
    h.closed_dates = ['2026-12-25']
    expect(isOpenOn(h, '2026-10-18')).toBe(false)
    expect(isOpenOn(h, '2026-12-25')).toBe(false)
    expect(isOpenOn(h, '2026-10-19')).toBe(true)
  })
  it('does not break on nonsense times', () => {
    const h = defaultBookingHours()
    h.days.mon.start = 'soon'
    expect(slotsFor(h, '2026-10-19')).toEqual([])
  })
})

describe('labels', () => {
  it('reads like a clock', () => {
    expect([0, 480, 720, 780, 1425].map(minutesLabel)).toEqual(['12:00 AM', '8:00 AM', '12:00 PM', '1:00 PM', '11:45 PM'])
    expect(timeLabel('17:30')).toBe('5:30 PM')
  })
})

describe('finding open days', () => {
  const sundaysOff = (() => { const h = defaultBookingHours(); h.days.sun.open = false; return h })()
  it('skips closed days', () => {
    expect(nextOpenDay(sundaysOff, '2026-10-17')).toBe('2026-10-19') // Saturday -> Monday
    expect(firstOpenDay(sundaysOff, '2026-10-18')).toBe('2026-10-19')
    expect(firstOpenDay(sundaysOff, '2026-10-19')).toBe('2026-10-19')
  })
  it('skips closed dates too', () => {
    const h = { ...sundaysOff, closed_dates: ['2026-10-19'] }
    expect(nextOpenDay(h, '2026-10-17')).toBe('2026-10-20')
  })
  it('gives up when nothing is ever open', () => {
    const h = defaultBookingHours()
    DAY_KEYS.forEach(k => { h.days[k].open = false })
    expect(nextOpenDay(h, '2026-10-17', 30)).toBeNull()
  })
})

describe('reading what the database stored', () => {
  it('uses the default when nothing is stored', () => {
    expect(normalizeBookingHours(null)).toEqual(defaultBookingHours())
    expect(normalizeBookingHours(undefined)).toEqual(defaultBookingHours())
    expect(normalizeBookingHours('x')).toEqual(defaultBookingHours())
  })
  it('keeps what was stored and fills in what is missing', () => {
    const got = normalizeBookingHours({ slot_minutes: 30, days: { mon: { open: false, start: '09:00', end: '12:00' } }, closed_dates: ['2026-12-25', 5] })
    expect(got.slot_minutes).toBe(30)
    expect(got.days.mon.open).toBe(false)
    expect(got.days.mon.break_start).toBeNull()
    expect(got.days.tue.open).toBe(true) // missing day: default
    expect(got.closed_dates).toEqual(['2026-12-25'])
  })
})

describe('what patients read', () => {
  it('groups days that share hours', () => {
    expect(hoursSummary(defaultBookingHours())).toBe('Mon–Sun 8:00 AM – 5:00 PM')
  })
  it('shows a short Saturday and the closed days', () => {
    const h = defaultBookingHours()
    h.days.sat.end = '12:00'
    h.days.sun.open = false
    expect(hoursLines(h)).toEqual(['Mon–Fri 8:00 AM – 5:00 PM', 'Sat 8:00 AM – 12:00 PM', 'Closed Sun'])
  })
  it('names two days with an ampersand', () => {
    const h = defaultBookingHours()
    DAY_KEYS.forEach(k => { h.days[k].open = k === 'tue' || k === 'wed' })
    expect(hoursLines(h)[0]).toBe('Tue & Wed 8:00 AM – 5:00 PM')
  })
})

describe('checking what was entered in Settings', () => {
  const ok = () => defaultBookingHours()
  const problem = (change: (h: BookingHours) => void, day: DayKey = 'mon') => {
    const h = ok(); change(h)
    return validateBookingHours(h).days[day] ?? validateBookingHours(h).general[0]
  }
  it('accepts the default and a typical clinic', () => {
    expect(hasProblems(validateBookingHours(ok()))).toBe(false)
    const h = ok(); h.days.sun.open = false; h.days.sat.end = '12:00'; h.days.sat.break_start = null; h.days.sat.break_end = null
    expect(hasProblems(validateBookingHours(h))).toBe(false)
  })
  it('catches closing before opening', () => expect(problem(h => { h.days.mon.start = '17:00'; h.days.mon.end = '08:00' })).toMatch(/after opening/))
  it('catches a day too short for one appointment', () => expect(problem(h => { h.slot_minutes = 120; h.days.mon.start = '08:00'; h.days.mon.end = '09:00'; h.days.mon.break_start = null; h.days.mon.break_end = null })).toMatch(/at least one appointment/))
  it('catches half a break', () => expect(problem(h => { h.days.mon.break_end = null })).toMatch(/break starts and ends/))
  it('catches a break outside opening hours', () => expect(problem(h => { h.days.mon.break_start = '07:00'; h.days.mon.break_end = '08:30' })).toMatch(/within opening hours/))
  it('catches a break that ends before it starts', () => expect(problem(h => { h.days.mon.break_start = '13:00'; h.days.mon.break_end = '12:00' })).toMatch(/end after it starts/))
  it('catches a break that leaves no room for an appointment', () => {
    expect(problem(h => { h.slot_minutes = 60; h.days.mon.start = '08:00'; h.days.mon.end = '09:00'; h.days.mon.break_start = '08:00'; h.days.mon.break_end = '09:00' })).toMatch(/No appointment fits/)
  })
  it('catches too many appointments in a day', () => expect(problem(h => { h.slot_minutes = 10; h.days.mon.start = '00:00'; h.days.mon.end = '23:00'; h.days.mon.break_start = null; h.days.mon.break_end = null })).toMatch(/more than 48/))
  it('catches a missing time', () => expect(problem(h => { h.days.mon.start = '' })).toMatch(/opening and closing time/))
  it('needs at least one open day', () => expect(problem(h => { DAY_KEYS.forEach(k => { h.days[k].open = false }) })).toMatch(/at least one day/))
  it('ignores the hours of a closed day', () => {
    const h = ok(); h.days.sun.open = false; h.days.sun.start = ''
    expect(validateBookingHours(h).days.sun).toBeUndefined()
  })
})

describe('closed dates', () => {
  it('adds in order, once, and only real-looking dates', () => {
    expect(addClosedDate(['2026-12-25'], '2026-11-01')).toEqual(['2026-11-01', '2026-12-25'])
    expect(addClosedDate(['2026-12-25'], '2026-12-25')).toEqual(['2026-12-25'])
    expect(addClosedDate([], 'christmas')).toEqual([])
  })
  it('removes', () => expect(removeClosedDate(['a', 'b'], 'a')).toEqual(['b']))
  it('drops dates that have already passed', () => {
    expect(dropPastDates(['2026-10-01', '2026-10-16', '2026-12-25'], '2026-10-16')).toEqual(['2026-10-16', '2026-12-25'])
  })
})

describe('showing a time as the whole appointment', () => {
  const slot = (minutes: number, end: number) => ({ minutes, end })
  it('says 8:00 – 8:30 AM when both ends are in the same half of the day', () => {
    expect(rangeLabel(slot(480, 510))).toBe('8:00 – 8:30 AM')
    expect(rangeLabel(slot(780, 840))).toBe('1:00 – 2:00 PM')
  })
  it('spells out both halves when it crosses noon', () => {
    expect(rangeLabel(slot(660, 720))).toBe('11:00 AM – 12:00 PM')
    expect(rangeLabel(slot(690, 750))).toBe('11:30 AM – 12:30 PM')
    expect(rangeLabel(slot(720, 780))).toBe('12:00 – 1:00 PM')
  })
  it('handles the start of the day and an appointment ending at midnight', () => {
    expect(rangeLabel(slot(0, 30))).toBe('12:00 – 12:30 AM')
    expect(rangeLabel(slot(1410, 1440))).toBe('11:30 PM – 12:00 AM')
  })
  it('follows the clinic\'s appointment length', () => {
    const h = defaultBookingHours()
    h.slot_minutes = 30
    h.days.mon.break_start = null; h.days.mon.break_end = null
    expect(displayTime(h, '2026-10-19', '8:30 AM')).toBe('8:30 – 9:00 AM')
    expect(displayTime(h, '2026-10-19', '12:00 PM')).toBe('12:00 – 12:30 PM')
  })
  it('leaves a saved time alone when it is not on the clinic\'s grid any more', () => {
    expect(displayTime(defaultBookingHours(), '2026-10-19', '9:15 AM')).toBe('9:15 AM')
    expect(displayTime(defaultBookingHours(), '2026-10-19', 'whenever')).toBe('whenever')
  })
})

describe('flexible appointment lengths', () => {
  it('accepts any length from 5 to 240 minutes in steps of 5', () => {
    for (const n of [5, 10, 25, 35, 60, 240]) expect(isValidLength(n)).toBe(true)
    for (const n of [0, 3, 17, 245, 250, 7.5, -5, NaN]) expect(isValidLength(n)).toBe(false)
    expect(isValidLength('30')).toBe(false)
  })
  it('lets one day use its own length', () => {
    const h = defaultBookingHours()
    h.slot_minutes = 60
    h.days.sat.slot_minutes = 30
    h.days.sat.end = '10:00'; h.days.sat.start = '08:00'; h.days.sat.break_start = null; h.days.sat.break_end = null
    expect(lengthFor(h, 'sat')).toBe(30)
    expect(lengthFor(h, 'mon')).toBe(60)
    expect(labels(h, '2026-10-17')).toEqual(['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM'])
    expect(slotsFor(h, '2026-10-17')[1]).toMatchObject({ minutes: 510, end: 540 })
  })
  it('is checked in Settings: a clinic-wide length and a day length', () => {
    const h = defaultBookingHours()
    h.slot_minutes = 17
    expect(validateBookingHours(h).general[0]).toMatch(/5 to 240 minutes/)
    const d = defaultBookingHours()
    d.days.tue.slot_minutes = 12
    expect(validateBookingHours(d).days.tue).toMatch(/must be 5 to 240 minutes/)
  })
  it('measures a day against its own length', () => {
    const h = defaultBookingHours()
    h.days.wed.slot_minutes = 240; h.days.wed.start = '08:00'; h.days.wed.end = '10:00'; h.days.wed.break_start = null; h.days.wed.break_end = null
    expect(validateBookingHours(h).days.wed).toMatch(/at least one appointment/)
    const many = defaultBookingHours()
    many.days.thu.slot_minutes = 5; many.days.thu.break_start = null; many.days.thu.break_end = null
    expect(validateBookingHours(many).days.thu).toMatch(/more than 48/)
  })
  it('is kept when reading what the database stored', () => {
    const got = normalizeBookingHours({ slot_minutes: 30, days: { sat: { open: true, start: '08:00', end: '12:00', slot_minutes: 15 } } })
    expect(got.days.sat.slot_minutes).toBe(15)
    expect(got.days.mon.slot_minutes).toBeUndefined()
  })
})
