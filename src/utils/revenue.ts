// Revenue helpers. Everything is judged in Philippine time (Asia/Manila, UTC+8, no daylight saving).
// Payments are stored as UTC timestamps without a zone marker, so "which day was this?" needs conversion.

import type { PaymentMethod } from '@/types'
import { addDays, daysBetween } from './booking'
import { parseDbTimestamp } from './billing'

const MANILA_OFFSET_MS = 8 * 3_600_000

/** Inclusive range of Manila dates, 'YYYY-MM-DD' */
export interface DateRange {
  from: string
  to: string
}

export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'last_month' | 'custom'

export const RANGE_OPTIONS: { key: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
]

const firstOfMonth = (iso: string) => `${iso.slice(0, 8)}01`

export function rangeFor(key: RangeKey, today: string, custom?: DateRange): DateRange {
  switch (key) {
    case 'today': return { from: today, to: today }
    case 'yesterday': return { from: addDays(today, -1), to: addDays(today, -1) }
    case '7d': return { from: addDays(today, -6), to: today }
    case '30d': return { from: addDays(today, -29), to: today }
    case 'month': return { from: firstOfMonth(today), to: today }
    case 'last_month': {
      const lastMonthEnd = addDays(firstOfMonth(today), -1)
      return { from: firstOfMonth(lastMonthEnd), to: lastMonthEnd }
    }
    // A copy, so callers never hold the object the date inputs are editing
    default: return custom ? { from: custom.from, to: custom.to } : { from: today, to: today }
  }
}

export const rangeLength = (r: DateRange) => daysBetween(r.from, r.to) + 1

/** The same number of days immediately before this range (for "vs previous period") */
export function previousRange(r: DateRange): DateRange {
  const length = rangeLength(r)
  return { from: addDays(r.from, -length), to: addDays(r.from, -1) }
}

export const isValidRange = (r: DateRange) =>
  /^\d{4}-\d{2}-\d{2}$/.test(r.from) && /^\d{4}-\d{2}-\d{2}$/.test(r.to) && r.to >= r.from && rangeLength(r) <= 800

/** Percent change, or null when there is nothing to compare against (previous was 0 but now isn't) */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// ── Display ──

export const formatMoney = (amount: number) =>
  Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1,250 → "1.3k", 2,400,000 → "2.4M" — for chart axes */
export function formatMoneyShort(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(amount))
}

const dateFmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`))

export function rangeLabel(r: DateRange): string {
  if (r.from === r.to) return dateFmt(r.from, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4)
  const start = dateFmt(r.from, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
  return `${start} – ${dateFmt(r.to, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export const dayLabel = (iso: string) => dateFmt(iso, { weekday: 'short', month: 'short', day: 'numeric' })
export const shortDay = (iso: string) => dateFmt(iso, { month: 'short', day: 'numeric' })

export const METHODS: Record<PaymentMethod, { label: string; icon: string; color: string; needsReference: boolean }> = {
  cash:  { label: 'Cash',  icon: '💵', color: '#22c55e', needsReference: false },
  gcash: { label: 'GCash', icon: '📱', color: '#3b82f6', needsReference: true },
  maya:  { label: 'Maya',  icon: '💜', color: '#8b5cf6', needsReference: true },
  card:  { label: 'Card',  icon: '💳', color: '#f59e0b', needsReference: true },
  other: { label: 'Other', icon: '🏦', color: '#64748b', needsReference: true },
}

export const methodMeta = (method: string) =>
  METHODS[method as PaymentMethod] ?? { label: method, icon: '💰', color: '#64748b', needsReference: false }

// ── Dates and times of stored payments ──

/** The Manila calendar date a stored (UTC) payment time falls on */
export function manilaDateOf(paidAt: string): string {
  return new Date(parseDbTimestamp(paidAt).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10)
}

export function manilaTimeLabel(paidAt: string): string {
  return parseDbTimestamp(paidAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
}

export function manilaDateTimeLabel(paidAt: string): string {
  return parseDbTimestamp(paidAt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
  })
}

/** UTC bounds (no zone marker, like the database) covering a Manila date range: start inclusive, end exclusive */
export function utcBounds(r: DateRange): { start: string; end: string } {
  const toNaive = (d: Date) => d.toISOString().replace('Z', '')
  return {
    start: toNaive(new Date(`${r.from}T00:00:00+08:00`)),
    end: toNaive(new Date(`${addDays(r.to, 1)}T00:00:00+08:00`)),
  }
}

/** Every date in the range, with 0 where nothing was paid (so charts have no gaps) */
export function fillDaily(r: DateRange, daily: { date: string; amount: number }[]): { date: string; amount: number }[] {
  const byDate = new Map(daily.map(d => [String(d.date).slice(0, 10), Number(d.amount)]))
  return Array.from({ length: rangeLength(r) }, (_, i) => {
    const date = addDays(r.from, i)
    return { date, amount: byDate.get(date) ?? 0 }
  })
}

export interface DayGroup<T> {
  date: string
  label: string
  /** Net of paid payments only */
  total: number
  items: T[]
}

/** Newest day first; within a day, newest payment first */
export function groupPaymentsByDay<T extends { paid_at: string; amount: number; status: string }>(items: T[]): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>()
  for (const item of [...items].sort((a, b) => parseDbTimestamp(b.paid_at).getTime() - parseDbTimestamp(a.paid_at).getTime())) {
    const date = manilaDateOf(item.paid_at)
    const group = map.get(date) ?? { date, label: dayLabel(date), total: 0, items: [] }
    group.items.push(item)
    if (item.status === 'paid') group.total += Number(item.amount)
    map.set(date, group)
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export const STATUS_META: Record<string, { label: string; classes: string }> = {
  paid:     { label: 'Paid',     classes: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  classes: 'bg-yellow-100 text-yellow-700' },
  refunded: { label: 'Refunded', classes: 'bg-amber-100 text-amber-700' },
  voided:   { label: 'Voided',   classes: 'bg-slate-100 text-slate-500' },
}
