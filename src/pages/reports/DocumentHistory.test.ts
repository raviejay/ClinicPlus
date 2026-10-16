import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { presetLayout } from '@/utils/documents/presets'

const mocks = vi.hoisted(() => ({
  auth: { clinic: { id: 'clinic-1' }, isAdmin: true, user: { id: 'me' } },
  listIssued: vi.fn(),
  void: vi.fn(),
  printHtml: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/composables/useBranchFilter', () => ({ useBranchFilter: () => ({ watchBranchChange: vi.fn() }) }))
vi.mock('@/services/document.service', () => ({ documentService: { listIssued: mocks.listIssued, void: mocks.void } }))
vi.mock('./DocumentPreview.vue', () => ({ default: { template: '<div class="preview-stub"></div>' } }))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printHtmlDocument: mocks.printHtml }))

import DocumentHistory from './DocumentHistory.vue'

const utc = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString().replace('Z', '')

const doc = (id: string, over: Record<string, unknown> = {}) => ({
  id, clinic_id: 'clinic-1', branch_id: null, patient_id: 'p1', kind: 'medcert', number: `MC-00000${id}`, template_id: null,
  layout: presetLayout('medcert', 'classic'),
  data: { values: { patient_name: `Patient ${id}`, document_number: `MC-00000${id}` }, medicines: [], logoUrl: null },
  patient_name: `Patient ${id}`, doctor_id: null, issued_by: 'me', issued_at: utc(60), status: 'issued',
  void_reason: null, voided_at: null, voided_by: null, issuer: { full_name: 'Ana' }, ...over,
})

let wrapper: VueWrapper
const mountPage = async () => { wrapper = mount(DocumentHistory); await flushPromises() }
const button = (text: string) => wrapper.findAll('button').find(b => b.text().trim().endsWith(text))
const row = (text: string) => wrapper.findAll('li button').find(b => b.text().includes(text))!
const lastCall = () => mocks.listIssued.mock.calls[mocks.listIssued.mock.calls.length - 1]

beforeEach(() => {
  mocks.auth.isAdmin = true
  mocks.auth.user = { id: 'me' }
  mocks.listIssued.mockResolvedValue({ data: [doc('1'), doc('2', { kind: 'prescription', number: 'RX-000002' })], error: null })
  mocks.void.mockResolvedValue({ data: {}, error: null })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.clearAllMocks() })

describe('history: the list', () => {
  it('loads issued documents by default', async () => {
    await mountPage()
    expect(lastCall()).toEqual(['clinic-1', { kind: undefined, status: 'issued', search: '' }, 200])
    expect(wrapper.text()).toContain('Patient 1')
    expect(wrapper.text()).toContain('MC-000001')
    expect(wrapper.text()).toContain('RX-000002')
    expect(wrapper.text()).toContain('Prescription (Rx)')
    expect(wrapper.text()).toContain('Ana')
  })
  it('strikes through voided documents and labels them', async () => {
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { status: 'voided' })], error: null })
    await mountPage()
    expect(wrapper.text()).toContain('Voided')
    expect(wrapper.find('li p.line-through').exists()).toBe(true)
  })
  it('explains an empty history differently from an empty search', async () => {
    mocks.listIssued.mockResolvedValue({ data: [], error: null })
    await mountPage()
    expect(wrapper.text()).toContain('No documents issued yet')
    await button('Certificates')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('No documents match')
  })
  it('shows a load error', async () => {
    mocks.listIssued.mockResolvedValue({ data: null, error: 'boom' })
    await mountPage()
    expect(wrapper.text()).toContain('boom')
  })
})

describe('history: filtering', () => {
  it('filters by type and status', async () => {
    await mountPage()
    await button('Prescriptions')!.trigger('click')
    await flushPromises()
    expect(lastCall()[1]).toMatchObject({ kind: 'prescription', status: 'issued' })
    await button('Voided')!.trigger('click')
    await flushPromises()
    expect(lastCall()[1]).toMatchObject({ kind: 'prescription', status: 'voided' })
    await button('All')!.trigger('click') // the status "All" (last "All" button)
    await flushPromises()
  })
  it('searches after a short pause, not on every keystroke', async () => {
    vi.useFakeTimers()
    await mountPage()
    mocks.listIssued.mockClear()
    const box = wrapper.find('input[type="search"]')
    await box.setValue('j')
    await box.setValue('ju')
    await box.setValue('juan')
    expect(mocks.listIssued).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.listIssued).toHaveBeenCalledTimes(1)
    expect(lastCall()[1]).toMatchObject({ search: 'juan' })
  })
})

describe('history: one document', () => {
  const open = async (text = 'Patient 1') => { await row(text).trigger('click'); await flushPromises() }

  it('opens with its details and reprints exactly as issued', async () => {
    await mountPage()
    await open()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.text()).toContain('Patient 1')
    expect(dialog.text()).toContain('MC-000001')
    await button('Reprint')!.trigger('click')
    expect(mocks.printHtml).toHaveBeenCalledTimes(1)
    expect(mocks.printHtml.mock.calls[0][0]).toContain('@page { size: 210mm 297mm')
  })
  it('shows why a voided document was voided and offers no void button', async () => {
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { status: 'voided', void_reason: 'Wrong patient', voided_at: utc(5) })], error: null })
    await mountPage()
    await open()
    expect(wrapper.find('[role="dialog"]').text()).toContain('Wrong patient')
    expect(button('Void')).toBeUndefined()
  })
  it('closes', async () => {
    await mountPage()
    await open()
    await wrapper.find('button[aria-label="Close"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('history: who can void', () => {
  const open = async () => { await row('Patient 1').trigger('click'); await flushPromises() }

  it('lets an admin void any time', async () => {
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { issued_by: 'someone', issued_at: utc(60 * 24) })], error: null })
    await mountPage()
    await open()
    expect(button('Void')).toBeDefined()
  })
  it('lets the person who issued it void within 15 minutes', async () => {
    mocks.auth.isAdmin = false
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { issued_at: utc(5) })], error: null })
    await mountPage()
    await open()
    expect(button('Void')).toBeDefined()
  })
  it("doesn't let them void after 15 minutes", async () => {
    mocks.auth.isAdmin = false
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { issued_at: utc(30) })], error: null })
    await mountPage()
    await open()
    expect(button('Void')).toBeUndefined()
    expect(wrapper.text()).toContain('Only an admin can void')
  })
  it("doesn't let staff void someone else's document", async () => {
    mocks.auth.isAdmin = false
    mocks.listIssued.mockResolvedValue({ data: [doc('1', { issued_by: 'someone', issued_at: utc(2) })], error: null })
    await mountPage()
    await open()
    expect(button('Void')).toBeUndefined()
  })
})

describe('history: voiding', () => {
  const start = async () => {
    await mountPage()
    await row('Patient 1').trigger('click')
    await flushPromises()
    await button('Void')!.trigger('click')
  }
  const confirm = () => wrapper.findAll('button').find(b => b.text().includes('Confirm void'))!

  it('needs a reason', async () => {
    await start()
    expect(confirm().attributes('disabled')).toBeDefined()
    await wrapper.find('#void-reason').setValue('no')
    expect(confirm().attributes('disabled')).toBeDefined()
    await wrapper.find('#void-reason').setValue('Wrong patient')
    expect(confirm().attributes('disabled')).toBeUndefined()
  })
  it('voids with the reason, closes, and refreshes the list', async () => {
    await start()
    await wrapper.find('#void-reason').setValue('  Issued to the wrong patient  ')
    mocks.listIssued.mockClear()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.void).toHaveBeenCalledWith('1', 'Issued to the wrong patient')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(mocks.listIssued).toHaveBeenCalled()
  })
  it('shows why voiding failed and keeps the dialog open', async () => {
    mocks.void.mockResolvedValue({ data: null, error: 'This document is already voided' })
    await start()
    await wrapper.find('#void-reason').setValue('Wrong patient')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('already voided')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})
