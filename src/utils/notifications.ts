import type { AppNotification } from '@/types'
import { parseDbTimestamp } from '@/utils/billing'

const time = (iso: string) => parseDbTimestamp(iso).getTime()

/** Alerts newer than the moment the person last looked */
export function unreadOf(items: AppNotification[], seenAt: string | null | undefined): AppNotification[] {
  if (!seenAt) return []
  const seen = time(seenAt)
  return items.filter(n => time(n.created_at) > seen)
}

/** Newest first, no repeats, capped */
export function mergeNotifications(current: AppNotification[], incoming: AppNotification[], cap = 30): AppNotification[] {
  const byId = new Map<string, AppNotification>()
  for (const n of [...incoming, ...current]) if (!byId.has(n.id)) byId.set(n.id, n)
  return [...byId.values()].sort((a, b) => time(b.created_at) - time(a.created_at)).slice(0, cap)
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "Oct 4" */
export function timeAgo(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - time(iso)) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'Yesterday'
  return parseDbTimestamp(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

/** The badge: "9+" rather than a number that overflows the bell */
export const badgeLabel = (count: number) => (count > 9 ? '9+' : String(count))

/** Where an alert leads: the schedule on the appointment's day, with the appointment marked */
export function scheduleLocation(appointmentId: string | null | undefined, date: string | null | undefined) {
  const query: Record<string, string> = {}
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) query.date = date
  if (appointmentId && query.date) query.appointment = appointmentId
  return { path: '/appointments', query }
}
