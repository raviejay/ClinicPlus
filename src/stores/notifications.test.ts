import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getRecent: vi.fn(), getAppointmentDate: vi.fn(), markSeen: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(),
  onNew: null as null | ((n: any) => void), push: vi.fn(),
}))

vi.mock('@/services/notification.service', () => ({
  notificationService: { getRecent: mocks.getRecent, getAppointmentDate: mocks.getAppointmentDate, markSeen: mocks.markSeen, subscribe: mocks.subscribe },
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))

import { useNotificationStore } from './notifications'
import NotificationBell from '@/components/NotificationBell.vue'
import NotificationToasts from '@/components/NotificationToasts.vue'

const note = (id: string, created_at: string, body = `Booking ${id}`) => ({
  id, clinic_id: 'c1', branch_id: null, type: 'new_appointment', title: 'New online appointment', body, appointment_id: `appt-${id}`, created_at,
})
const OLD = note('old', '2026-10-15T08:00:00Z')
const SEEN = '2026-10-15T09:00:00Z'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  mocks.getRecent.mockResolvedValue({ data: [OLD], error: null })
  mocks.markSeen.mockResolvedValue({ data: null, error: null })
  mocks.getAppointmentDate.mockResolvedValue('2026-10-19')
  mocks.subscribe.mockImplementation((_clinic: string, cb: (n: any) => void) => { mocks.onNew = cb; return mocks.unsubscribe })
})
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); document.body.innerHTML = '' })

describe('notification store', () => {
  it('loads recent alerts and starts listening, counting only what is newer than the last look', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    expect(mocks.getRecent).toHaveBeenCalledWith('c1')
    expect(mocks.subscribe).toHaveBeenCalledWith('c1', expect.any(Function))
    expect(store.items).toHaveLength(1)
    expect(store.unreadCount).toBe(0)
  })

  it('starts only once per person, however many pages ask', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    await store.start('c1', 'u1', SEEN)
    expect(mocks.subscribe).toHaveBeenCalledTimes(1)
  })

  it('does not flood a person with old alerts when nothing is known about what they saw', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', null)
    expect(store.unreadCount).toBe(0)
  })

  it('shows a new booking at once: unread, with a toast', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z', 'Juan booked for Oct 17 at 9:00 AM'))
    expect(store.unreadCount).toBe(1)
    expect(store.items[0].id).toBe('n1')
    expect(store.toasts).toEqual([{ id: 'n1', title: 'New online appointment', body: 'Juan booked for Oct 17 at 9:00 AM', appointmentId: 'appt-n1' }])
  })

  it('ignores an alert it already has', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    expect(store.items.filter(i => i.id === 'n1')).toHaveLength(1)
    expect(store.toasts).toHaveLength(1)
  })

  it('shows at most three toasts, and each goes away by itself', async () => {
    vi.useFakeTimers()
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    for (let i = 1; i <= 5; i++) mocks.onNew!(note(`n${i}`, `2026-10-16T10:0${i}:00Z`))
    expect(store.toasts.map(t => t.id)).toEqual(['n3', 'n4', 'n5'])
    vi.advanceTimersByTime(8100)
    expect(store.toasts).toEqual([])
  })

  it('marks everything read using the newest alert\'s own time, and tells the server', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    await store.markAllSeen()
    expect(store.unreadCount).toBe(0)
    expect(mocks.markSeen).toHaveBeenCalledWith('u1', '2026-10-16T10:00:00Z')
    mocks.onNew!(note('n2', '2026-10-16T10:05:00Z'))
    expect(store.unreadCount).toBe(1) // a later one is still unread
  })

  it('stops listening and forgets everything on sign-out', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    store.stop()
    expect(mocks.unsubscribe).toHaveBeenCalled()
    expect(store.items).toEqual([])
    await store.start('c1', 'u1', SEEN) // can start again afterwards
    expect(mocks.subscribe).toHaveBeenCalledTimes(2)
  })

  it('explains when the notifications table is missing, instead of staying silently empty', async () => {
    mocks.getRecent.mockResolvedValue({ data: null, error: "Could not find the table 'public.notifications' in the schema cache" })
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    expect(store.problem).toMatch(/Run the latest Supabase migration/)
    mocks.getRecent.mockResolvedValue({ data: [OLD], error: null })
    await store.refresh()
    expect(store.problem).toBe('')
  })

  it('remembers the sound preference', () => {
    const store = useNotificationStore()
    expect(store.soundOn).toBe(true)
    store.setSound(false)
    expect(localStorage.getItem('clinicgo-alert-sound')).toBe('off')
    setActivePinia(createPinia())
    expect(useNotificationStore().soundOn).toBe(false)
  })
})

let wrapper: VueWrapper
const stubs = { global: { stubs: { Teleport: true } } }

describe('notification bell', () => {
  const mountBell = async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    wrapper = mount(NotificationBell, { attachTo: document.body })
    return store
  }
  afterEach(() => wrapper?.unmount())

  it('shows no badge when everything has been seen', async () => {
    await mountBell()
    expect(wrapper.find('[data-testid="badge"]').exists()).toBe(false)
  })

  it('shows how many are new, with a count a screen reader can read', async () => {
    await mountBell()
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    mocks.onNew!(note('n2', '2026-10-16T10:01:00Z'))
    await flushPromises()
    expect(wrapper.find('[data-testid="badge"]').text()).toBe('2')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Notifications, 2 new')
  })

  it('opens the list, marks it read, but still highlights what was new', async () => {
    const store = await mountBell()
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z', 'Juan booked for Oct 17 at 9:00 AM'))
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Juan booked for Oct 17 at 9:00 AM')
    expect(store.unreadCount).toBe(0)
    expect(mocks.markSeen).toHaveBeenCalled()
    expect(wrapper.find('[aria-label="Unread"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="badge"]').exists()).toBe(false)
  })

  it('shows the problem in the panel when the list cannot be loaded', async () => {
    mocks.getRecent.mockResolvedValue({ data: null, error: 'relation "notifications" does not exist' })
    await mountBell()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toContain('not set up in the database yet')
  })

  it('has a friendly empty state', async () => {
    mocks.getRecent.mockResolvedValue({ data: [], error: null })
    await mountBell()
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Nothing new yet')
  })

  it("opens the schedule on that appointment's day, with it marked, when an alert is chosen", async () => {
    await mountBell()
    await wrapper.find('button').trigger('click')
    await wrapper.find('li button').trigger('click')
    await flushPromises()
    expect(mocks.getAppointmentDate).toHaveBeenCalledWith('appt-old')
    expect(mocks.push).toHaveBeenCalledWith({ path: '/appointments', query: { date: '2026-10-19', appointment: 'appt-old' } })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('lets the sound be turned off from the panel', async () => {
    const store = await mountBell()
    await wrapper.find('button').trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(false)
    expect(store.soundOn).toBe(false)
  })
})

describe('notification toasts', () => {
  it('announces a new booking and opens the appointments when chosen', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    wrapper = mount(NotificationToasts, { ...stubs })
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z', 'Juan booked for Oct 17 at 9:00 AM'))
    await flushPromises()
    expect(wrapper.text()).toContain('Juan booked for Oct 17 at 9:00 AM')
    await wrapper.find('[role="status"] .min-w-0').trigger('click')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/appointments', query: { date: '2026-10-19', appointment: 'appt-n1' } })
    expect(store.toasts).toEqual([])
    wrapper.unmount()
  })

  it('still opens the schedule when the appointment cannot be found', async () => {
    mocks.getAppointmentDate.mockResolvedValue(null)
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    wrapper = mount(NotificationToasts, { ...stubs })
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    await flushPromises()
    await wrapper.find('[role="status"] .min-w-0').trigger('click')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/appointments', query: {} })
    wrapper.unmount()
  })

  it('can be dismissed', async () => {
    const store = useNotificationStore()
    await store.start('c1', 'u1', SEEN)
    wrapper = mount(NotificationToasts, { ...stubs })
    mocks.onNew!(note('n1', '2026-10-16T10:00:00Z'))
    await flushPromises()
    await wrapper.find('[aria-label="Dismiss"]').trigger('click')
    expect(store.toasts).toEqual([])
    wrapper.unmount()
  })
})
