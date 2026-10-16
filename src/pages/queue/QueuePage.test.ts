import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  queue: null as any,
  loadQueue: vi.fn(),
  callNext: vi.fn(), updateStatus: vi.fn(), markDoneWithAppointment: vi.fn(), addToQueue: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }), RouterLink: { template: '<a><slot /></a>' } }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/components/ui/FeatureGate.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/components/ui/PatientLookup.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ clinic: { id: 'c1' }, profile: { id: 'doc1' } }),
}))
vi.mock('@/composables/useBranchFilter', () => ({ useBranchFilter: () => ({ watchBranchChange: vi.fn() }) }))
vi.mock('@/services/patient.service', () => ({ patientService: {} }))
vi.mock('@/services/queue.service', () => ({
  queueService: {
    callNext: mocks.callNext, updateStatus: mocks.updateStatus,
    markDoneWithAppointment: mocks.markDoneWithAppointment, addToQueue: mocks.addToQueue,
  },
}))
vi.mock('@/composables/useQueueRealtime', async () => {
  const { ref, computed } = await import('vue')
  const queue = ref<any[]>([])
  mocks.queue = queue
  return {
    useQueueRealtime: () => ({
      queue, loading: ref(false),
      nowServing: computed(() => queue.value.find(q => q.status === 'now_serving') ?? null),
      counts: computed(() => ({
        waiting: queue.value.filter(q => q.status === 'waiting').length,
        now_serving: queue.value.filter(q => q.status === 'now_serving').length,
        done: queue.value.filter(q => q.status === 'done').length,
      })),
      loadQueue: mocks.loadQueue, subscribe: vi.fn(),
    }),
  }
})

import QueuePage from './QueuePage.vue'

const entry = (n: number, name: string, status: string, minutesAgo = 5) => ({
  id: `q${n}`, priority_number: n, status, appointment_id: null,
  created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString().replace('Z', ''),
  patients: { full_name: name, contact_number: `0917000000${n}` }, profiles: null,
})

let wrapper: VueWrapper
const mountPage = async () => { wrapper = mount(QueuePage, { attachTo: document.body }); await flushPromises() }
const button = (text: string) => {
  const found = wrapper.findAll('button').find(b => b.text().includes(text))
  if (!found) throw new Error(`no button "${text}"`)
  return found
}

beforeEach(() => {
  mocks.queue.value = []
  mocks.callNext.mockResolvedValue({ data: {}, error: null })
  mocks.updateStatus.mockResolvedValue({ data: {}, error: null })
  mocks.markDoneWithAppointment.mockResolvedValue({ data: {}, error: null })
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

describe('queue page: states', () => {
  it('shows a friendly empty state when nobody has arrived', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('No one in the queue yet')
  })

  it('says the queue is clear once everyone has been seen', async () => {
    mocks.queue.value = [entry(1, 'Dina Done', 'done')]
    await mountPage()
    expect(wrapper.text()).toContain('Queue is clear')
    expect(wrapper.text()).toContain('1 patient seen today')
  })

  it('previews who is next, with how long they have waited, and calls them', async () => {
    mocks.queue.value = [entry(3, 'Wendy Waiting', 'waiting', 12), entry(2, 'Walt Waiting', 'waiting', 30)]
    await mountPage()
    const upNext = wrapper.find('[aria-label="Call next patient"]')
    expect(upNext.text()).toContain('Walt Waiting') // lowest number goes first
    expect(upNext.text()).toContain('Waiting 30 min')
    await button('Call next patient').trigger('click')
    await flushPromises()
    expect(mocks.callNext).toHaveBeenCalledWith('c1', 'doc1')
  })

  it('marks the first waiting patient as next and shows each wait', async () => {
    mocks.queue.value = [entry(1, 'Ann', 'waiting', 50), entry(2, 'Bob', 'waiting', 3)]
    await mountPage()
    const rows = wrapper.findAll('[aria-label="Waiting"] li')
    expect(rows[0].text()).toContain('Next')
    expect(rows[0].text()).toContain('50 min')
    expect(rows[1].text()).not.toContain('Next')
    expect(wrapper.text()).toContain('longest 50 min')
  })
})

describe('queue page: serving', () => {
  beforeEach(() => {
    mocks.queue.value = [entry(1, 'Sam Serving', 'now_serving'), entry(2, 'Next Nina', 'waiting')]
  })

  it('shows the patient being served', async () => {
    await mountPage()
    expect(wrapper.find('[aria-label="Now serving"]').text()).toContain('Sam Serving')
    expect(wrapper.text()).not.toContain('Call next patient')
  })

  it('finishes a visit', async () => {
    await mountPage()
    await button('Mark done').trigger('click')
    await flushPromises()
    expect(mocks.markDoneWithAppointment).toHaveBeenCalledWith('c1', expect.objectContaining({ id: 'q1' }))
    expect(mocks.callNext).not.toHaveBeenCalled()
  })

  it('finishes the visit and calls the next patient in one tap', async () => {
    await mountPage()
    await button('Done & call #2').trigger('click')
    await flushPromises()
    expect(mocks.markDoneWithAppointment).toHaveBeenCalledWith('c1', expect.objectContaining({ id: 'q1' }))
    expect(mocks.callNext).toHaveBeenCalledWith('c1', 'doc1')
  })

  it('offers only "Mark done" when nobody is waiting', async () => {
    mocks.queue.value = [entry(1, 'Sam Serving', 'now_serving')]
    await mountPage()
    expect(wrapper.text()).toContain('Mark done')
    expect(wrapper.text()).not.toContain('Done & call')
  })

  it('calls a specific waiting patient, finishing the current one first', async () => {
    await mountPage()
    await wrapper.find('[aria-label="Waiting"] li').findAll('button').find(b => b.text() === 'Call')!.trigger('click')
    await flushPromises()
    expect(mocks.updateStatus).toHaveBeenNthCalledWith(1, 'c1', 'q1', 'done')
    expect(mocks.updateStatus).toHaveBeenNthCalledWith(2, 'c1', 'q2', 'now_serving', 'doc1')
  })
})

describe('queue page: skipping', () => {
  it('skips a patient, and lets them be put back in their place', async () => {
    mocks.queue.value = [entry(1, 'Sky Skipper', 'waiting')]
    await mountPage()
    await wrapper.find('[aria-label="Waiting"] li').findAll('button').find(b => b.text() === 'Skip')!.trigger('click')
    await flushPromises()
    expect(mocks.updateStatus).toHaveBeenCalledWith('c1', 'q1', 'skipped')

    mocks.queue.value = [entry(1, 'Sky Skipper', 'skipped')]
    await flushPromises()
    const skipped = wrapper.find('[aria-label="Skipped"]')
    expect(skipped.text()).toContain('Sky Skipper')
    await skipped.findAll('button').find(b => b.text() === 'Put back')!.trigger('click')
    await flushPromises()
    expect(mocks.updateStatus).toHaveBeenCalledWith('c1', 'q1', 'waiting')
  })

  it('has no skipped list until someone is skipped', async () => {
    mocks.queue.value = [entry(1, 'Ann', 'waiting')]
    await mountPage()
    expect(wrapper.find('[aria-label="Skipped"]').exists()).toBe(false)
  })
})

describe('queue page: lists', () => {
  it('lists today\'s finished visits, newest first', async () => {
    mocks.queue.value = [entry(1, 'First Fiona', 'done'), entry(2, 'Second Sid', 'done')]
    await mountPage()
    const rows = wrapper.findAll('[aria-label="Done"] li')
    expect(rows[0].text()).toContain('Second Sid')
    expect(rows[1].text()).toContain('First Fiona')
  })

  it('opens the TV display', async () => {
    await mountPage()
    await button('TV Display').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ name: 'queue-tv' })
  })
})
