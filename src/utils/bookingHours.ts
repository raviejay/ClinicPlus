// A clinic's booking hours: which days it takes bookings, when, how long each appointment is,
// and which dates are closed. The database enforces the same rules (booking_slots() in
// supabase/migrations/20261023000000_booking_hours.sql); the booking page and Settings use these.

import { addDays, daysBetween } from '@/utils/booking'

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DayHours {
  open: boolean
  /** 'HH:MM', 24-hour */
  start: string
  end: string
  break_start: string | null
  break_end: string | null
  /** This day's own appointment length; absent/null = the clinic-wide one */
  slot_minutes?: number | null
}

export interface BookingHours {
  slot_minutes: number
  days: Record<DayKey, DayHours>
  /** 'YYYY-MM-DD' dates with no bookings (holidays, trainings) */
  closed_dates: string[]
}

export interface Slot {
  /** The start time, which is what an appointment is saved with: '8:00 AM' */
  label: string
  /** Minutes after midnight, clinic local time */
  minutes: number
  /** When the appointment ends, in minutes after midnight */
  end: number
  period: 'morning' | 'afternoon'
}

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const DAY_NAMES: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
/** Appointment length: any number of minutes from 5 to 240, in steps of 5 */
export const MIN_SLOT_MINUTES = 5
export const MAX_SLOT_MINUTES = 240
export const SLOT_STEP = 5
/** One-tap choices in Settings (any other length can still be typed) */
export const QUICK_LENGTHS = [15, 20, 30, 45, 60, 90]
export const isValidLength = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= MIN_SLOT_MINUTES && n <= MAX_SLOT_MINUTES && n % SLOT_STEP === 0
export const MAX_SLOTS_PER_DAY = 48
export const MAX_CLOSED_DATES = 366

const DEFAULT_DAY: DayHours = { open: true, start: '08:00', end: '17:00', break_start: '12:00', break_end: '13:00' }

/** Every day, hourly from 8:00 AM to 5:00 PM with a 12:00-1:00 PM break: what clinics had before this was configurable */
export function defaultBookingHours(): BookingHours {
  return {
    slot_minutes: 60,
    days: Object.fromEntries(DAY_KEYS.map(d => [d, { ...DEFAULT_DAY }])) as Record<DayKey, DayHours>,
    closed_dates: [],
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** 540 -> '9:00 AM', 0 -> '12:00 AM', 720 -> '12:00 PM' */
export function minutesLabel(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/** '17:00' -> '5:00 PM' */
export const timeLabel = (hhmm: string) => minutesLabel(toMinutes(hhmm))

/** The weekday of a 'YYYY-MM-DD' calendar date */
export function dayKeyOf(iso: string): DayKey {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = Sunday
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[dow]
}

function isDayHours(v: unknown): v is DayHours {
  const d = v as DayHours
  return !!d && typeof d === 'object' && typeof d.open === 'boolean' && typeof d.start === 'string' && typeof d.end === 'string'
}

/** Reads what the database stored (or nothing) into a complete schedule, falling back to the default for anything missing */
export function normalizeBookingHours(raw: unknown): BookingHours {
  const base = defaultBookingHours()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<BookingHours>
  const days = { ...base.days }
  for (const k of DAY_KEYS) {
    const d = r.days?.[k]
    if (isDayHours(d)) {
      days[k] = { open: d.open, start: d.start, end: d.end, break_start: d.break_start ?? null, break_end: d.break_end ?? null }
      if (typeof d.slot_minutes === 'number') days[k].slot_minutes = d.slot_minutes
    }
  }
  return {
    slot_minutes: typeof r.slot_minutes === 'number' ? r.slot_minutes : base.slot_minutes,
    days,
    closed_dates: Array.isArray(r.closed_dates) ? r.closed_dates.filter(x => typeof x === 'string') : [],
  }
}

/** How long an appointment lasts on a weekday: the day's own length, else the clinic-wide one */
export const lengthFor = (hours: BookingHours, key: DayKey) => hours.days[key].slot_minutes ?? hours.slot_minutes

/** The times a patient may book on a date, in order. Empty when the clinic is closed that day. */
export function slotsFor(hours: BookingHours, iso: string): Slot[] {
  if (hours.closed_dates.includes(iso)) return []
  const day = hours.days[dayKeyOf(iso)]
  if (!day?.open || !TIME.test(day.start) || !TIME.test(day.end)) return []

  const len = lengthFor(hours, dayKeyOf(iso))
  const start = toMinutes(day.start), end = toMinutes(day.end)
  const hasBreak = !!day.break_start && !!day.break_end && TIME.test(day.break_start) && TIME.test(day.break_end)
  const bs = hasBreak ? toMinutes(day.break_start!) : 0
  const be = hasBreak ? toMinutes(day.break_end!) : 0

  const out: Slot[] = []
  for (let t = start; t + len <= end; t += len) {
    // A slot that touches the break is not offered
    if (hasBreak && t < be && t + len > bs) continue
    out.push({ label: minutesLabel(t), minutes: t, end: t + len, period: t < 12 * 60 ? 'morning' : 'afternoon' })
  }
  return out
}

/** '8:00 – 8:30 AM', or '11:30 AM – 12:00 PM' when it crosses noon (the end time is when the appointment ends) */
export function rangeLabel(slot: Pick<Slot, 'minutes' | 'end'>): string {
  const start = minutesLabel(slot.minutes), end = minutesLabel(slot.end % 1440)
  const [startClock, startPart] = start.split(' ')
  const endPart = end.split(' ')[1]
  return startPart === endPart ? `${startClock} – ${end}` : `${start} – ${end}`
}

/** What to show for a saved time like '9:00 AM' on a date: its range when the clinic's grid knows it, else the time as it was */
export function displayTime(hours: BookingHours, iso: string, label: string): string {
  const slot = slotsFor(hours, iso).find(x => x.label === label)
  return slot ? rangeLabel(slot) : label
}

export const isOpenOn = (hours: BookingHours, iso: string) => slotsFor(hours, iso).length > 0

/** The next date after `from` that takes bookings (within about two years), or null */
export function nextOpenDay(hours: BookingHours, from: string, lookAhead = 730): string | null {
  for (let i = 1; i <= lookAhead; i++) {
    const iso = addDays(from, i)
    if (isOpenOn(hours, iso)) return iso
  }
  return null
}

/** The first open date on or after `from`, or null */
export function firstOpenDay(hours: BookingHours, from: string, lookAhead = 730): string | null {
  return isOpenOn(hours, from) ? from : nextOpenDay(hours, from, lookAhead)
}

// ── What patients read: "Mon–Fri 8:00 AM – 5:00 PM · Sat 8:00 AM – 12:00 PM" ──

const SHORT: Record<DayKey, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

/** One line per group of consecutive days that share hours, plus the closed days */
export function hoursLines(hours: BookingHours): string[] {
  const lines: string[] = []
  let i = 0
  while (i < DAY_KEYS.length) {
    const d = hours.days[DAY_KEYS[i]]
    if (!d.open) { i++; continue }
    let j = i
    while (j + 1 < DAY_KEYS.length && sameHours(hours.days[DAY_KEYS[j + 1]], d)) j++
    const range = i === j ? SHORT[DAY_KEYS[i]] : j === i + 1 ? `${SHORT[DAY_KEYS[i]]} & ${SHORT[DAY_KEYS[j]]}` : `${SHORT[DAY_KEYS[i]]}–${SHORT[DAY_KEYS[j]]}`
    lines.push(`${range} ${timeLabel(d.start)} – ${timeLabel(d.end)}`)
    i = j + 1
  }
  const closed = DAY_KEYS.filter(k => !hours.days[k].open)
  if (closed.length && closed.length < 7) lines.push(`Closed ${closed.map(k => SHORT[k]).join(', ')}`)
  return lines
}

function sameHours(a: DayHours, b: DayHours) {
  return a.open === b.open && a.start === b.start && a.end === b.end
}

/** "Mon–Sat 8:00 AM – 5:00 PM", or several lines joined with " · " */
export const hoursSummary = (hours: BookingHours) => hoursLines(hours).join(' · ')

// ── Settings: is what was entered usable? ──

export interface HoursProblems {
  general: string[]
  days: Partial<Record<DayKey, string>>
}

export function validateBookingHours(hours: BookingHours): HoursProblems {
  const problems: HoursProblems = { general: [], days: {} }
  if (!isValidLength(hours.slot_minutes)) problems.general.push(`Appointments can last ${MIN_SLOT_MINUTES} to ${MAX_SLOT_MINUTES} minutes, in steps of ${SLOT_STEP}.`)

  let openDays = 0
  for (const k of DAY_KEYS) {
    const d = hours.days[k]
    if (!d.open) continue
    openDays++
    if (!TIME.test(d.start) || !TIME.test(d.end)) { problems.days[k] = 'Enter an opening and closing time.'; continue }
    const start = toMinutes(d.start), end = toMinutes(d.end)
    const len = lengthFor(hours, k)
    if (d.slot_minutes != null && !isValidLength(d.slot_minutes)) {
      problems.days[k] = `This day's appointment length must be ${MIN_SLOT_MINUTES} to ${MAX_SLOT_MINUTES} minutes, in steps of ${SLOT_STEP}.`
      continue
    }
    if (end <= start) { problems.days[k] = 'Closing time must be after opening time.'; continue }
    if (end - start < len) { problems.days[k] = 'Open for at least one appointment length.'; continue }
    if (Math.floor((end - start) / len) > MAX_SLOTS_PER_DAY) {
      problems.days[k] = `That is more than ${MAX_SLOTS_PER_DAY} appointments in a day. Use a longer appointment or shorter hours.`
      continue
    }
    const anyBreak = !!d.break_start || !!d.break_end
    if (anyBreak) {
      if (!d.break_start || !d.break_end || !TIME.test(d.break_start) || !TIME.test(d.break_end)) { problems.days[k] = 'Enter when the break starts and ends.'; continue }
      const bs = toMinutes(d.break_start), be = toMinutes(d.break_end)
      if (be <= bs) { problems.days[k] = 'The break must end after it starts.'; continue }
      if (bs < start || be > end) { problems.days[k] = 'The break must be within opening hours.'; continue }
    }
    if (slotsFor({ ...hours, closed_dates: [] }, sampleDateFor(k)).length === 0) {
      problems.days[k] = 'No appointment fits between the opening time and the break.'
    }
  }
  if (openDays === 0) problems.general.push('Open at least one day, or patients cannot book.')
  if (hours.closed_dates.length > MAX_CLOSED_DATES) problems.general.push(`At most ${MAX_CLOSED_DATES} closed dates.`)
  if (hours.closed_dates.some(d => !ISO_DATE.test(d))) problems.general.push('A closed date is not a valid date.')
  return problems
}

export const hasProblems = (p: HoursProblems) => p.general.length > 0 || Object.keys(p.days).length > 0

/** A date that falls on the given weekday (2026-10-19 is a Monday), only used to test a weekday's hours */
function sampleDateFor(k: DayKey): string {
  return addDays('2026-10-19', DAY_KEYS.indexOf(k))
}

// ── Closed dates ──

/** Add a date, keeping the list sorted, unique and free of dates long gone */
export function addClosedDate(dates: string[], iso: string): string[] {
  if (!ISO_DATE.test(iso) || dates.includes(iso)) return dates
  return [...dates, iso].sort()
}

export const removeClosedDate = (dates: string[], iso: string) => dates.filter(d => d !== iso)

/** Dates already in the past are dropped when saving, so the list does not grow forever */
export function dropPastDates(dates: string[], today: string): string[] {
  return dates.filter(d => daysBetween(today, d) >= 0)
}
