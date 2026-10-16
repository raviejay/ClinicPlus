import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const queue = vi.hoisted(() => ({ state: null as any }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ clinic: { id: 'c1', name: 'Demo Clinic' } }) }))
vi.mock('@/composables/useQueueRealtime', async () => {
  const { ref } = await import('vue')
  const person = (name: string) => ({
    id: name, queue_number: 7, status: 'in_consultation', patients: { full_name: name, contact_number: '0917 555 1234' }, profiles: null,
  })
  queue.state = {
    loading: ref(false),
    waiting: ref([{ ...person('Waiting Wendy'), status: 'waiting' }]),
    nowServing: ref(person('Serving Sam')),
    done: ref([{ ...person('Done Dina'), status: 'completed' }]),
    counts: ref({ waiting: 1, serving: 1, done: 1 }),
    loadQueue: vi.fn(), subscribe: vi.fn(),
  }
  return { useQueueRealtime: () => queue.state }
})

import QueueTVDisplay from './QueueTVDisplay.vue'

afterEach(() => vi.clearAllMocks())

describe('queue TV display', () => {
  it('shows names but never a patient phone number (the screen faces the waiting room)', async () => {
    const wrapper = mount(QueueTVDisplay)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Serving Sam')
    expect(text).toContain('Waiting Wendy')
    expect(text).not.toContain('0917')
    expect(text).not.toContain('555 1234')
    wrapper.unmount()
  })
})
