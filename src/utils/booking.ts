// Helpers for the public booking page: time slots, Manila-time dates,
// light input validation, and the "add to calendar" file.

/** What the booking page knows about a date's availability (from get_public_availability) */
export interface BookingAvailability {
  booked: string[]
  /** The clinic's current date (Manila) and minutes since midnight, from the server */
  today: string
  minutes: number
  loading: boolean
  loadedOnce: boolean
  error: boolean
}

export interface SlotDef {
  label: string
  /** Minutes after midnight, clinic local time */
  minutes: number
  period: 'morning' | 'afternoon'
}

/** Parses '9:00 AM' / '1:30 PM' into minutes after midnight. Null if it isn't that format. */
export function slotMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim())
  if (!m) return null
  const hours = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return hours * 60 + Number(m[2])
}

const SLOT_LABELS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

export const BOOKING_SLOTS: SlotDef[] = SLOT_LABELS.map(label => {
  const minutes = slotMinutes(label) ?? 0
  return { label, minutes, period: minutes < 12 * 60 ? 'morning' : 'afternoon' }
})

/** "8:00 AM – 5:00 PM", derived from the slot list (each slot is one hour) */
export function openingHoursLabel(): string {
  const first = BOOKING_SLOTS[0]
  const last = BOOKING_SLOTS[BOOKING_SLOTS.length - 1]
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  return `${fmt(first.minutes)} – ${fmt(last.minutes + 60)}`
}

// ── Dates (ISO 'YYYY-MM-DD'; the clinic runs on Philippine time) ──

/** Today's date in Manila, regardless of the visitor's device time zone */
export function manilaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)
}

export function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', ...opts }).format(d)
  return { weekday: fmt({ weekday: 'short' }), day: fmt({ day: 'numeric' }), month: fmt({ month: 'short' }) }
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(`${iso}T00:00:00Z`))
}

// ── Validation (friendly hints; the server validates again) ──

export function isValidPhone(value: string): boolean {
  const v = value.trim()
  const digits = v.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(v) && digits.length >= 7 && digits.length <= 15
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Short code patients can quote when they call the clinic */
export function bookingReference(appointmentId: string): string {
  return appointmentId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

// ── Add to calendar (.ics) ──

const icsEscape = (text: string) => text.replace(/[\\;,]/g, m => `\\${m}`).replace(/\r?\n/g, '\\n')

function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildIcs(opts: {
  uid: string
  title: string
  description: string
  location: string
  date: string
  slot: string
  durationMinutes?: number
}): string {
  const start = slotMinutes(opts.slot) ?? 9 * 60
  const [y, mo, d] = opts.date.split('-').map(Number)
  // Manila is UTC+8 all year (no daylight saving), so converting to UTC is a fixed shift
  const startUtc = new Date(Date.UTC(y, mo - 1, d, 0, start - 8 * 60))
  const endUtc = new Date(startUtc.getTime() + (opts.durationMinutes ?? 30) * 60_000)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClinicGo//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@clinicgo`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(startUtc)}`,
    `DTEND:${icsUtc(endUtc)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    `LOCATION:${icsEscape(opts.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/calendar;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
