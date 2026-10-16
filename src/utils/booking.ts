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

/** Badge under a time button on the staff booking page */
export function slotLoadLabel(total: number, doctorBusy: boolean): string {
  if (doctorBusy) return 'Doctor busy'
  return total === 1 ? '1 booked' : `${total} booked`
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

// ── Month calendar ──

/** The weeks of a month (month is 1-12) as ISO dates, Sunday first, with null padding at both ends */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** Moves a year/month pair by whole months (delta may be negative) */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// ── Where the clinic is ──

export interface LocationInfo {
  /** "Clinic" or "Clinic — Branch" */
  name: string
  address: string
  phone: string
  /** What to search on the map */
  mapQuery: string
  hasAddress: boolean
}

export function bookingLocation(
  clinic: { name: string; address?: string | null; phone?: string | null; latitude?: number | null; longitude?: number | null },
  branch: { name: string; address?: string | null; contact_number?: string | null } | null,
): LocationInfo {
  const address = branch?.address?.trim() || clinic.address?.trim() || ''
  const phone = branch?.contact_number?.trim() || clinic.phone?.trim() || ''
  const name = branch ? `${clinic.name} — ${branch.name}` : clinic.name
  // The clinic's pinned spot is exact; a branch with its own address takes over from it
  const pinned = !branch?.address?.trim() && clinic.latitude != null && clinic.longitude != null
    ? `${clinic.latitude},${clinic.longitude}` : ''
  return {
    name,
    address,
    phone,
    // With an address the search is precise; without one the clinic's name is the best we have
    mapQuery: pinned || (address ? `${clinic.name}, ${address}` : `${clinic.name}, Philippines`),
    hasAddress: !!address || !!pinned,
  }
}

export const mapEmbedUrl = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=16`
export const directionsUrl = (query: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
export const telUrl = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`
