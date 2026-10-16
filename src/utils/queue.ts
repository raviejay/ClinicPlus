import { parseDbTimestamp } from '@/utils/billing'

/** Whole minutes someone has been in the queue (never negative) */
export function waitMinutes(createdAt: string | null | undefined, now = new Date()): number {
  if (!createdAt) return 0
  const since = parseDbTimestamp(createdAt).getTime()
  if (Number.isNaN(since)) return 0
  return Math.max(0, Math.floor((now.getTime() - since) / 60_000))
}

/** "Just now", "12 min", "1 h 5 min" */
export function waitLabel(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** How worried to look about a wait: used to colour the chip */
export function waitTone(minutes: number): 'ok' | 'long' | 'very-long' {
  return minutes >= 45 ? 'very-long' : minutes >= 20 ? 'long' : 'ok'
}
