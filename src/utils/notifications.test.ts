import { describe, expect, it } from 'vitest'
import { badgeLabel, mergeNotifications, scheduleLocation, timeAgo, unreadOf } from './notifications'
import type { AppNotification } from '@/types'

const n = (id: string, created_at: string): AppNotification => ({
  id, clinic_id: 'c', branch_id: null, type: 'new_appointment', title: 'New', body: id, appointment_id: null, created_at,
})
const ids = (list: AppNotification[]) => list.map(x => x.id)

describe('unread alerts', () => {
  const list = [n('a', '2026-10-16T10:00:00Z'), n('b', '2026-10-16T09:00:00Z'), n('c', '2026-10-16T08:00:00Z')]
  it('are the ones newer than the last time the person looked', () => {
    expect(ids(unreadOf(list, '2026-10-16T08:30:00Z'))).toEqual(['a', 'b'])
    expect(unreadOf(list, '2026-10-16T10:00:00Z')).toEqual([])
  })
  it('counts nothing when it is not known what has been seen (so old alerts do not flood in)', () => {
    expect(unreadOf(list, null)).toEqual([])
    expect(unreadOf(list, undefined)).toEqual([])
  })
  it('reads database times without a zone as UTC', () => {
    expect(ids(unreadOf([n('x', '2026-10-16T10:00:00')], '2026-10-16T09:59:00+00:00'))).toEqual(['x'])
  })
})

describe('merging', () => {
  it('puts the newest first and drops repeats', () => {
    const merged = mergeNotifications([n('b', '2026-10-16T09:00:00Z')], [n('a', '2026-10-16T10:00:00Z'), n('b', '2026-10-16T09:00:00Z')])
    expect(ids(merged)).toEqual(['a', 'b'])
  })
  it('keeps only the newest few', () => {
    const many = Array.from({ length: 40 }, (_, i) => n(`n${i}`, `2026-10-${String(1 + (i % 28)).padStart(2, '0')}T00:00:00Z`))
    expect(mergeNotifications([], many, 30)).toHaveLength(30)
  })
})

describe('time ago', () => {
  const now = new Date('2026-10-16T10:00:00Z')
  it('reads naturally', () => {
    expect(timeAgo('2026-10-16T09:59:40Z', now)).toBe('Just now')
    expect(timeAgo('2026-10-16T09:45:00Z', now)).toBe('15 min ago')
    expect(timeAgo('2026-10-16T05:00:00Z', now)).toBe('5 h ago')
    expect(timeAgo('2026-10-15T05:00:00Z', now)).toBe('Yesterday')
    expect(timeAgo('2026-10-01T05:00:00Z', now)).toMatch(/Oct/)
  })
})

describe('badge', () => {
  it('caps at 9+', () => {
    expect(badgeLabel(3)).toBe('3')
    expect(badgeLabel(10)).toBe('9+')
  })
})

describe('where an alert leads', () => {
  it("is the schedule on the appointment's day, with the appointment marked", () => {
    expect(scheduleLocation('a1', '2026-10-19')).toEqual({ path: '/appointments', query: { date: '2026-10-19', appointment: 'a1' } })
  })
  it('is just the schedule when the day is unknown or malformed', () => {
    expect(scheduleLocation('a1', null)).toEqual({ path: '/appointments', query: {} })
    expect(scheduleLocation('a1', 'tomorrow')).toEqual({ path: '/appointments', query: {} })
    expect(scheduleLocation(null, null)).toEqual({ path: '/appointments', query: {} })
  })
})
