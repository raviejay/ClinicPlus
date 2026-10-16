// When text doesn't fit its box, issuing needs a deliberate "issue anyway".
// The preview is stubbed so the test can say which elements overflow (jsdom has no layout).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { presetLayout } from '@/utils/documents/presets'

const mocks = vi.hoisted(() => ({
  overflow: [] as string[],
  issue: vi.fn(),
  printHtml: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ clinic: { id: 'c1', name: 'Clinic', email: null }, profile: { id: 'me', role: 'admin' } }),
}))
vi.mock('@/stores/branch', () => ({ useBranchStore: () => ({ branches: [] }) }))
vi.mock('@/services/document.service', () => ({
  documentService: { listTemplates: async () => ({ data: [], error: null }), issue: mocks.issue },
}))
vi.mock('@/services/staff.service', () => ({ staffService: { getAll: async () => ({ data: [{ id: 'me', role: 'admin', full_name: 'Maria' }], error: null }) } }))
vi.mock('@/services/clinic.service', () => ({ clinicService: { getClinicBranding: async () => ({ data: null, error: null }) } }))
vi.mock('@/services/patient.service', () => ({ patientService: { getById: async () => ({ data: null, error: null }) } }))
vi.mock('@/components/ui/PatientLookup.vue', () => ({
  default: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<button type="button" class="pick-patient" @click="$emit(\'update:modelValue\', { id: \'p1\', full_name: \'Juan\', branch_id: null })">pick</button>',
  },
}))
vi.mock('./DocumentPreview.vue', () => ({
  default: {
    props: ['layout', 'data'],
    emits: ['overflow'],
    mounted(this: { $emit: (e: string, ...a: unknown[]) => void }) { this.$emit('overflow', mocks.overflow) },
    template: '<div class="preview-stub"></div>',
  },
}))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printHtmlDocument: mocks.printHtml }))

import IssueDocument from './IssueDocument.vue'

let wrapper: VueWrapper
const issueButton = () => wrapper.findAll('button').find(b => b.text().includes('Issue & print'))!

beforeEach(() => {
  mocks.overflow = []
  mocks.issue.mockResolvedValue({
    data: { id: 'd', number: 'MC-000001', kind: 'medcert', layout: presetLayout('medcert', 'classic'), data: { values: {}, medicines: [], logoUrl: null } },
    error: null,
  })
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

async function mountReady() {
  wrapper = mount(IssueDocument)
  await flushPromises()
  await wrapper.find('.pick-patient').trigger('click')
  await wrapper.find('#doctor').setValue('me')
}

describe('issue: text that does not fit', () => {
  it('issues normally when everything fits', async () => {
    await mountReady()
    expect(wrapper.text()).not.toContain("doesn't fit")
    expect(issueButton().attributes('disabled')).toBeUndefined()
  })

  it('names the overflowing parts and blocks issuing until confirmed', async () => {
    mocks.overflow = ['body']
    await mountReady()
    expect(wrapper.text()).toContain("Some text doesn't fit this design")
    expect(wrapper.text()).toContain('Body') // the element's label in the preset
    expect(issueButton().attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(issueButton().attributes('disabled')).toBeUndefined()
    await issueButton().trigger('click')
    await flushPromises()
    expect(mocks.issue).toHaveBeenCalledTimes(1)
  })

  it('asks again after changing the design', async () => {
    mocks.overflow = ['body']
    await mountReady()
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('select[aria-label="Template"]').setValue('builtin:modern')
    expect(issueButton().attributes('disabled')).toBeDefined()
  })
})
