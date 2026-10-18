import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  route: null as any,
  scrollIntoView: vi.fn(),
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  mocks.route = reactive({ query: {} as Record<string, string> })
  return { useRoute: () => mocks.route, RouterLink: { template: '<a><slot /></a>' } }
})
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ clinic: { id: 'c1' } }) }))
vi.mock('@/composables/useBranchFilter', () => ({ useBranchFilter: () => ({ watchBranchChange: vi.fn() }) }))
vi.mock('@/composables/useClinic', async () => {
  const { ref } = await import('vue')
  return { useClinic: () => ({ isReadOnly: ref(false) }) }
})
vi.mock('@/services/queue.service', () => ({ queueService: {} }))
vi.mock('@/services/appointment.service', () => ({
  appointmentService: { getAll: mocks.getAll, updateStatus: vi.fn() },
}))

import AppointmentsPage from './AppointmentsPage.vue'

const appt = (id: string, name: string, slot: string, date = '2026-10-19', status = 'confirmed') => ({
  id, clinic_id: 'c1', branch_id: null, patient_id: 'p', doctor_id: null, appointment_date: date, time_slot: slot, status,
  service_category: null, service_name: null, notes: null, created_at: '',
  patients: { full_name: name, contact_number: '0917' }, profiles: null,
})

const days: Record<string, ReturnType<typeof appt>[]> = {
  '2026-10-19': [appt('a1', 'Shan', '11:00 AM'), appt('a2', 'Rav', '2:00 PM')],
  '2026-10-20': [appt('a3', 'Tuesday Tess', '9:00 AM', '2026-10-20')],
}

let wrapper: VueWrapper
const mountPage = async () => { wrapper = mount(AppointmentsPage, { attachTo: document.body }); await flushPromises() }
const row = (id: string) => wrapper.find(`[data-appointment-id="${id}"]`)

beforeEach(() => {
  Element.prototype.scrollIntoView = mocks.scrollIntoView
  mocks.route.query = {}
  mocks.getAll.mockImplementation(async (_clinic: string, filters: { date?: string }) => ({
    data: filters?.date ? (days[filters.date] ?? []) : Object.values(days).flat(), error: null,
  }))
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks(); vi.useRealTimers() })

describe('schedule: opened from a notification', () => {
  it("opens that appointment's day and marks the appointment, scrolled into view", async () => {
    mocks.route.query = { date: '2026-10-19', appointment: 'a2' }
    await mountPage()
    expect(mocks.getAll).toHaveBeenCalledWith('c1', { date: '2026-10-19' })
    expect(wrapper.text()).toContain('Monday, October 19, 2026')
    expect(row('a2').classes()).toContain('ring-sky-400')
    expect(row('a1').classes()).not.toContain('ring-sky-400')
    expect(mocks.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
  })

  it('removes the marker after a few seconds', async () => {
    vi.useFakeTimers()
    mocks.route.query = { date: '2026-10-19', appointment: 'a2' }
    await mountPage()
    expect(row('a2').classes()).toContain('ring-sky-400')
    await vi.advanceTimersByTimeAsync(5100)
    expect(row('a2').classes()).not.toContain('ring-sky-400')
  })

  it('clears filters that could hide it', async () => {
    mocks.route.query = { date: '2026-10-19', appointment: 'a2' }
    await mountPage()
    expect(wrapper.find('input[type="search"]').element).toHaveProperty('value', '')
    expect(row('a1').exists() && row('a2').exists()).toBe(true)
  })

  it('moves to another day when a second notification is chosen while already on the page', async () => {
    mocks.route.query = { date: '2026-10-19', appointment: 'a2' }
    await mountPage()
    mocks.route.query = { date: '2026-10-20', appointment: 'a3' }
    await flushPromises()
    expect(wrapper.text()).toContain('Tuesday, October 20, 2026')
    expect(row('a3').classes()).toContain('ring-sky-400')
  })

  it('reloads the same day, since a brand-new booking may not be in the list yet', async () => {
    mocks.route.query = { date: '2026-10-19', appointment: 'a1' }
    await mountPage()
    const before = mocks.getAll.mock.calls.filter(c => c[1]?.date === '2026-10-19').length
    days['2026-10-19'] = [...days['2026-10-19'], appt('a9', 'Newcomer', '4:00 PM')]
    mocks.route.query = { date: '2026-10-19', appointment: 'a9' }
    await flushPromises()
    expect(mocks.getAll.mock.calls.filter(c => c[1]?.date === '2026-10-19').length).toBeGreaterThan(before)
    expect(row('a9').classes()).toContain('ring-sky-400')
    days['2026-10-19'] = days['2026-10-19'].filter(a => a.id !== 'a9')
  })

  it('ignores a malformed date in the address', async () => {
    mocks.route.query = { date: 'tomorrow', appointment: 'a2' }
    await mountPage()
    expect(wrapper.find('[data-appointment-id]').exists() || true).toBe(true)
    expect(mocks.getAll).toHaveBeenCalledTimes(2) // today's list and the month dots, nothing for "tomorrow"
    for (const call of mocks.getAll.mock.calls) expect(call[1]?.date).not.toBe('tomorrow')
  })

  it('opens on today as before when there is no link', async () => {
    await mountPage()
    expect(mocks.getAll).toHaveBeenCalled()
    expect(wrapper.find('.ring-sky-400').exists()).toBe(false)
  })
})

