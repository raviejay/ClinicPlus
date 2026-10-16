import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  auth: { clinic: { id: 'clinic-1', name: 'Demo Clinic' } },
  patients: [] as any[],
  doctors: [] as any[],
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/services/patient.service', () => ({ patientService: { getAll: async () => ({ data: mocks.patients, error: null }) } }))
vi.mock('@/services/staff.service', () => ({ staffService: { getAll: async () => ({ data: mocks.doctors, error: null }) } }))

import ReportsPage from './ReportsPage.vue'

const EVIL = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>'

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(ReportsPage, { attachTo: document.body })
  await flushPromises()
}
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
const preview = () => document.getElementById('printable-doc')

async function generate(type: 'Medical Certificate' | 'Prescription', fill: () => Promise<void> = async () => {}) {
  await button(type)!.trigger('click')
  await wrapper.find('input[placeholder="Search patient name…"]').setValue('Evil')
  await wrapper.findAll('button').find(b => b.text().includes('Evil'))!.trigger('click')
  await wrapper.find('select').setValue('d1')
  await fill()
  await button('Preview & Print')!.trigger('click')
  await flushPromises()
}

beforeEach(() => {
  ;(window as any).__pwned = undefined
  mocks.patients = [{ id: 'p1', full_name: `Evil ${EVIL}`, contact_number: '0917', birthdate: null, gender: null }]
  mocks.doctors = [{ id: 'd1', full_name: 'Reyes', role: 'doctor' }]
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('reports: documents show typed text literally, never as HTML', () => {
  it('escapes a hostile patient name, diagnosis and remarks in a medical certificate', async () => {
    await mountPage()
    await generate('Medical Certificate', async () => {
      const [diagnosis, remarks] = wrapper.findAll('textarea')
      await diagnosis.setValue(EVIL)
      await remarks.setValue(EVIL)
    })

    const doc = preview()!
    expect(doc).not.toBeNull()
    expect(doc.querySelector('img')).toBeNull()
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.textContent).toContain('<img src=x onerror="window.__pwned=1">') // shown as text
    expect((window as any).__pwned).toBeUndefined()
  })

  it('escapes hostile medicine names and sig in a prescription', async () => {
    await mountPage()
    await generate('Prescription', async () => {
      const [name, sig] = [
        wrapper.find('input[placeholder^="Drug name"]'),
        wrapper.find('input[placeholder^="Sig"]'),
      ]
      await name.setValue(EVIL)
      await sig.setValue(EVIL)
    })

    const doc = preview()!
    expect(doc.querySelector('img')).toBeNull()
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.textContent).toContain('onerror="window.__pwned=1"')
    expect((window as any).__pwned).toBeUndefined()
  })

  it('escapes a hostile doctor name', async () => {
    mocks.doctors = [{ id: 'd1', full_name: `Dr ${EVIL}`, role: 'doctor' }]
    await mountPage()
    await generate('Medical Certificate')
    expect(preview()!.querySelector('img')).toBeNull()
    expect((window as any).__pwned).toBeUndefined()
  })

  it('still renders normal documents with names and details', async () => {
    mocks.patients = [{ id: 'p1', full_name: 'Evil Juan Dela Cruz', contact_number: '0917', birthdate: null, gender: 'male' }]
    await mountPage()
    await generate('Medical Certificate', async () => {
      await wrapper.findAll('textarea')[0].setValue('Fit to work')
    })
    expect(preview()!.textContent).toContain('Evil Juan Dela Cruz')
    expect(preview()!.textContent).toContain('Fit to work')
    expect(preview()!.textContent).toContain('Dr. Reyes')
    expect(preview()!.textContent).toContain('Demo Clinic')
  })
})
