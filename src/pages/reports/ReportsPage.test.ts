import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ query: {} as Record<string, string>, replace: vi.fn() }))

vi.mock('vue-router', () => ({ useRoute: () => ({ query: mocks.query }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('./IssueDocument.vue', () => ({
  default: {
    props: ['initialPatientId', 'initialKind'],
    emits: ['show-history'],
    template: '<div data-test="issue" :data-patient="initialPatientId" :data-kind="initialKind"><button class="to-history" @click="$emit(\'show-history\')">history</button></div>',
  },
}))
vi.mock('./DocumentHistory.vue', () => ({ default: { template: '<div data-test="history"></div>' } }))
vi.mock('./TemplateManager.vue', () => ({ default: { template: '<div data-test="templates"></div>' } }))

import ReportsPage from './ReportsPage.vue'

let wrapper: VueWrapper
const mountPage = () => { wrapper = mount(ReportsPage) }
const tab = (label: string) => wrapper.findAll('[role="tab"]').find(t => t.text().includes(label))!

beforeEach(() => { mocks.query = {} })
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

describe('reports page tabs', () => {
  it('opens on "Issue a document"', () => {
    mountPage()
    expect(wrapper.find('[data-test="issue"]').exists()).toBe(true)
    expect(tab('Issue').attributes('aria-selected')).toBe('true')
  })
  it('opens the tab named in the address', () => {
    mocks.query = { tab: 'templates' }
    mountPage()
    expect(wrapper.find('[data-test="templates"]').exists()).toBe(true)
    mocks.query = { tab: 'history' }
    wrapper.unmount()
    mountPage()
    expect(wrapper.find('[data-test="history"]').exists()).toBe(true)
  })
  it('ignores an unknown tab name', () => {
    mocks.query = { tab: 'nonsense' }
    mountPage()
    expect(wrapper.find('[data-test="issue"]').exists()).toBe(true)
  })
  it('switches tabs by updating the address', async () => {
    mountPage()
    await tab('History').trigger('click')
    expect(mocks.replace).toHaveBeenCalledWith({ query: { tab: 'history' } })
    await tab('Templates').trigger('click')
    expect(mocks.replace).toHaveBeenCalledWith({ query: { tab: 'templates' } })
    await tab('Issue').trigger('click')
    expect(mocks.replace).toHaveBeenCalledWith({ query: {} })
  })
  it('passes the patient and type from a patient chart', () => {
    mocks.query = { patient: 'p1', kind: 'prescription' }
    mountPage()
    const issue = wrapper.find('[data-test="issue"]')
    expect(issue.attributes('data-patient')).toBe('p1')
    expect(issue.attributes('data-kind')).toBe('prescription')
  })
  it('ignores an unknown document type', () => {
    mocks.query = { patient: 'p1', kind: 'invoice' }
    mountPage()
    expect(wrapper.find('[data-test="issue"]').attributes('data-kind')).toBeUndefined()
  })
  it('jumps to the history when asked by the issue form', async () => {
    mountPage()
    await wrapper.find('.to-history').trigger('click')
    expect(mocks.replace).toHaveBeenCalledWith({ query: { tab: 'history' } })
  })
})
