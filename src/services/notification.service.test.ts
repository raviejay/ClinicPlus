import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  limit: vi.fn(), order: vi.fn(), eq: vi.fn(), select: vi.fn(), update: vi.fn(), updateEq: vi.fn(),
  channel: vi.fn(), on: vi.fn(), subscribe: vi.fn(), removeChannel: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => (table === 'notifications' ? { select: m.select } : { update: m.update }),
    channel: m.channel,
    removeChannel: m.removeChannel,
    functions: { invoke: vi.fn() },
  },
}))

import { notificationService } from './notification.service'

beforeEach(() => {
  vi.clearAllMocks()
  m.select.mockReturnValue({ eq: m.eq })
  m.eq.mockReturnValue({ order: m.order })
  m.order.mockReturnValue({ limit: m.limit })
  m.limit.mockResolvedValue({ data: [{ id: 'n1' }], error: null })
  m.update.mockReturnValue({ eq: m.updateEq })
  m.updateEq.mockResolvedValue({ error: null })
  m.channel.mockReturnValue({ on: m.on })
  m.on.mockReturnValue({ subscribe: m.subscribe })
  m.subscribe.mockReturnValue('channel')
})

describe('notification service', () => {
  it("fetches the clinic's latest alerts, newest first", async () => {
    const { data } = await notificationService.getRecent('c1', 10)
    expect(data).toEqual([{ id: 'n1' }])
    expect(m.eq).toHaveBeenCalledWith('clinic_id', 'c1')
    expect(m.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(m.limit).toHaveBeenCalledWith(10)
  })

  it('reports a failed fetch', async () => {
    m.limit.mockResolvedValue({ data: null, error: { message: 'denied' } })
    expect(await notificationService.getRecent('c1')).toEqual({ data: null, error: 'denied' })
  })

  it('saves when the person last looked, on their own profile', async () => {
    await notificationService.markSeen('u1', '2026-10-16T10:00:00Z')
    expect(m.update).toHaveBeenCalledWith({ notifications_seen_at: '2026-10-16T10:00:00Z' })
    expect(m.updateEq).toHaveBeenCalledWith('id', 'u1')
  })

  it("listens for new alerts for this clinic only, and hands each one over", () => {
    const onNew = vi.fn()
    const stop = notificationService.subscribe('c1', onNew)
    const [event, filter, handler] = m.on.mock.calls[0]
    expect(event).toBe('postgres_changes')
    expect(filter).toMatchObject({ event: 'INSERT', table: 'notifications', filter: 'clinic_id=eq.c1' })
    handler({ new: { id: 'n9' } })
    expect(onNew).toHaveBeenCalledWith({ id: 'n9' })
    stop()
    expect(m.removeChannel).toHaveBeenCalledWith('channel')
  })
})
