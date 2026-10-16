import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { presetLayout } from '@/utils/documents/presets'

const mocks = vi.hoisted(() => ({
  auth: {
    clinic: { id: 'clinic-1', name: 'Sunrise Clinic', email: 'hi@sunrise.ph' },
    profile: { id: 'me', role: 'admin', full_name: 'Maria Reyes' },
  },
  patient: { id: 'p1', clinic_id: 'clinic-1', full_name: 'Juan Dela Cruz', contact_number: '0917', birthdate: '1992-03-04', gender: 'male', address: '45 Mabini St', branch_id: null } as any,
  listTemplates: vi.fn(),
  issue: vi.fn(),
  getStaff: vi.fn(),
  getBranding: vi.fn(),
  getPatient: vi.fn(),
  printHtml: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/branch', () => ({ useBranchStore: () => ({ branches: [] }) }))
vi.mock('@/services/document.service', () => ({ documentService: { listTemplates: mocks.listTemplates, issue: mocks.issue } }))
vi.mock('@/services/staff.service', () => ({ staffService: { getAll: mocks.getStaff } }))
vi.mock('@/services/clinic.service', () => ({ clinicService: { getClinicBranding: mocks.getBranding } }))
vi.mock('@/services/patient.service', () => ({ patientService: { getById: mocks.getPatient } }))
vi.mock('@/components/ui/PatientLookup.vue', () => ({
  default: {
    props: ['modelValue', 'label', 'required'],
    emits: ['update:modelValue'],
    template: '<button type="button" class="pick-patient" @click="$emit(\'update:modelValue\', $options.patient())">{{ modelValue ? modelValue.full_name : \'Choose patient\' }}</button>',
    patient: () => mocks.patient,
  },
}))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printHtmlDocument: mocks.printHtml }))

import IssueDocument from './IssueDocument.vue'

const staff = [
  { id: 'me', role: 'admin', full_name: 'Maria Reyes' },
  { id: 'd2', role: 'doctor', full_name: 'Dr. Jose Santos' },
  { id: 's1', role: 'staff', full_name: 'Front Desk' },
]

const savedTemplate = (over: Record<string, unknown> = {}) => ({
  id: 'tpl-1', clinic_id: 'clinic-1', kind: 'medcert', name: 'Our letterhead', is_default: true, created_at: '', updated_at: '',
  layout: presetLayout('medcert', 'modern'), ...over,
})

const issuedDoc = (over: Record<string, unknown> = {}) => ({
  id: 'doc-1', number: 'MC-000007', kind: 'medcert', status: 'issued', patient_name: 'Juan Dela Cruz',
  layout: presetLayout('medcert', 'classic'),
  data: { values: { patient_name: 'Juan Dela Cruz', document_number: 'MC-000007', doctor_name: 'Dr. Maria Reyes' }, medicines: [], logoUrl: null },
  ...over,
})

let wrapper: VueWrapper
const mountForm = async (props: Record<string, unknown> = {}) => {
  wrapper = mount(IssueDocument, { props, attachTo: document.body })
  await flushPromises()
}
const pick = async () => { await wrapper.find('.pick-patient').trigger('click'); await flushPromises() }
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
const issueButton = () => button('Issue & print')!
const page = () => document.querySelector('.doc-page') as HTMLElement
const set = async (sel: string, v: string) => { await wrapper.find(sel).setValue(v) }

beforeEach(() => {
  mocks.patient = { id: 'p1', clinic_id: 'clinic-1', full_name: 'Juan Dela Cruz', contact_number: '0917', birthdate: '1992-03-04', gender: 'male', address: '45 Mabini St', branch_id: null }
  mocks.listTemplates.mockResolvedValue({ data: [], error: null })
  mocks.getStaff.mockResolvedValue({ data: staff, error: null })
  mocks.getBranding.mockResolvedValue({ data: { logo_url: 'https://cdn.test/logo.png', primary_color: '#10b981' }, error: null })
  mocks.getPatient.mockResolvedValue({ data: mocks.patient, error: null })
  mocks.issue.mockResolvedValue({ data: issuedDoc(), error: null })
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('issue: designs', () => {
  it('offers the built-in designs, Classic first', async () => {
    await mountForm()
    const select = wrapper.find('select[aria-label="Template"]')
    expect((select.element as HTMLSelectElement).value).toBe('builtin:classic')
    expect(select.text()).toContain('Classic')
    expect(select.text()).toContain('Modern')
    expect(select.text()).toContain('Plain')
    expect(select.text()).not.toContain('Your templates')
  })
  it("uses the clinic's default template when there is one", async () => {
    mocks.listTemplates.mockResolvedValue({ data: [savedTemplate(), savedTemplate({ id: 'tpl-2', name: 'Other', is_default: false })], error: null })
    await mountForm()
    const select = wrapper.find('select[aria-label="Template"]')
    expect((select.element as HTMLSelectElement).value).toBe('tpl-1')
    expect(select.text()).toContain('Our letterhead (default)')
    expect(select.text()).toContain('Other')
  })
  it("only lists templates of the chosen document type", async () => {
    mocks.listTemplates.mockResolvedValue({ data: [savedTemplate(), savedTemplate({ id: 'rx-1', kind: 'prescription', name: 'Rx pad', layout: presetLayout('prescription', 'classic') })], error: null })
    await mountForm()
    expect(wrapper.find('select[aria-label="Template"]').text()).not.toContain('Rx pad')
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Prescription'))!.trigger('click')
    expect(wrapper.find('select[aria-label="Template"]').text()).toContain('Rx pad')
    expect(wrapper.find('select[aria-label="Template"]').text()).not.toContain('Our letterhead')
  })
})

describe('issue: the live preview', () => {
  it('shows what has been typed on the page', async () => {
    await mountForm()
    await pick()
    await set('#doctor', 'd2')
    await set('#diagnosis', 'Acute gastroenteritis')
    await set('#rest-days', '3')
    expect(page().textContent).toContain('Juan Dela Cruz')
    expect(page().textContent).toContain('34 y/o, Male')
    expect(page().textContent).toContain('Findings / Diagnosis:')
    expect(page().textContent).toContain('Acute gastroenteritis')
    expect(page().textContent).toContain('advised to rest for 3 day(s)')
    expect(page().textContent).toContain('Dr. Jose Santos')
  })
  it('leaves out optional parts that were not filled in', async () => {
    await mountForm()
    await pick()
    expect(page().textContent).not.toContain('Findings / Diagnosis:')
    expect(page().textContent).not.toContain('advised to rest')
    expect(page().textContent).not.toContain('Valid until')
  })
  it("shows the clinic logo from branding", async () => {
    await mountForm()
    expect(page().innerHTML).toContain('https://cdn.test/logo.png')
  })
  it('never lets typed text become markup', async () => {
    mocks.patient = { ...mocks.patient, full_name: 'Evil <img src=x onerror="alert(1)"><script>alert(2)</script>' }
    mocks.getBranding.mockResolvedValue({ data: { logo_url: null, primary_color: '#10b981' }, error: null })
    await mountForm()
    await pick()
    await set('#diagnosis', '<img src=x onerror="alert(3)">')
    expect(page().querySelector('img')).toBeNull()
    expect(page().querySelector('script')).toBeNull()
    expect(page().textContent).toContain('<img src=x onerror="alert(3)">')
  })
})

describe('issue: certificate', () => {
  async function fill() {
    await pick()
    await set('#doctor', 'd2')
    await set('#purpose', 'employment')
    await set('#diagnosis', '  Flu  ')
    await set('#remarks', 'Rest')
    await set('#rest-days', '2')
  }

  it('needs a patient and a doctor', async () => {
    await mountForm()
    expect(issueButton().attributes('disabled')).toBeDefined() // no patient yet
    await pick()
    // An admin or doctor is preselected as the attending doctor, so a patient is enough...
    expect(issueButton().attributes('disabled')).toBeUndefined()
    // ...but clearing the doctor blocks it again
    await set('#doctor', '')
    expect(issueButton().attributes('disabled')).toBeDefined()
    await set('#doctor', 'd2')
    expect(issueButton().attributes('disabled')).toBeUndefined()
  })

  it('offers only doctors and admins as the attending doctor', async () => {
    await mountForm()
    const names = wrapper.findAll('#doctor option').map(o => o.text())
    expect(names).toContain('Maria Reyes')
    expect(names).toContain('Dr. Jose Santos')
    expect(names).not.toContain('Front Desk')
  })

  it('selects the signed-in doctor or admin by default', async () => {
    await mountForm()
    expect((wrapper.find('#doctor').element as HTMLSelectElement).value).toBe('me')
  })

  it('saves the document with the layout and details used, then prints it', async () => {
    await mountForm()
    await fill()
    await issueButton().trigger('click')
    await flushPromises()

    expect(mocks.issue).toHaveBeenCalledTimes(1)
    const arg = mocks.issue.mock.calls[0][0]
    expect(arg).toMatchObject({ kind: 'medcert', patient_id: 'p1', doctor_id: 'd2', template_id: null })
    expect(arg.layout.paper.size).toBe('a4')
    expect(arg.layout.elements.length).toBeGreaterThan(5)
    expect(arg.data.values.patient_name).toBe('Juan Dela Cruz')
    expect(arg.data.values.diagnosis).toBe('Flu')
    expect(arg.data.values.purpose_suffix).toBe(' (Employment / Work)')
    expect(arg.data.medicines).toEqual([])
    expect(arg.data.logoUrl).toBe('https://cdn.test/logo.png')

    expect(wrapper.text()).toContain('MC-000007 issued')
    expect(mocks.printHtml).toHaveBeenCalledTimes(1)
    const html = mocks.printHtml.mock.calls[0][0] as string
    expect(html).toContain('MC-000007')
    expect(html).toContain('@page { size: 210mm 297mm')
  })

  it('records which saved template was used', async () => {
    mocks.listTemplates.mockResolvedValue({ data: [savedTemplate()], error: null })
    await mountForm()
    await fill()
    await issueButton().trigger('click')
    await flushPromises()
    expect(mocks.issue.mock.calls[0][0].template_id).toBe('tpl-1')
  })

  it('shows an error and does not print when issuing fails', async () => {
    mocks.issue.mockResolvedValue({ data: null, error: 'Your trial has ended. Choose a plan to issue documents again.' })
    await mountForm()
    await fill()
    await issueButton().trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Your trial has ended')
    expect(wrapper.text()).not.toContain('MC-000007 issued')
    expect(wrapper.text()).not.toContain('Print again')
    expect(mocks.printHtml).not.toHaveBeenCalled()
  })

  it('does not issue twice while it is saving', async () => {
    let done: (v: unknown) => void = () => {}
    mocks.issue.mockReturnValue(new Promise(r => { done = r }))
    await mountForm()
    await fill()
    const btn = issueButton()
    await btn.trigger('click')
    await btn.trigger('click') // while "Issuing…" the button is disabled
    expect(btn.attributes('disabled')).toBeDefined()
    expect(mocks.issue).toHaveBeenCalledTimes(1)
    done({ data: issuedDoc(), error: null })
    await flushPromises()
  })

  it('reprints the issued document and can start another', async () => {
    await mountForm()
    await fill()
    await issueButton().trigger('click')
    await flushPromises()
    await button('Print again')!.trigger('click')
    expect(mocks.printHtml).toHaveBeenCalledTimes(2)
    await button('Issue another')!.trigger('click')
    expect(wrapper.text()).not.toContain('MC-000007 issued')
    expect(wrapper.find('.pick-patient').text()).toContain('Choose patient')
    expect((wrapper.find('#diagnosis').element as HTMLTextAreaElement).value).toBe('')
  })

  it('asks the parent to show the history', async () => {
    await mountForm()
    await fill()
    await issueButton().trigger('click')
    await flushPromises()
    await button('View history')!.trigger('click')
    expect(wrapper.emitted('show-history')).toHaveLength(1)
  })
})

describe('issue: prescription', () => {
  const rxMode = async () => {
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Prescription'))!.trigger('click')
  }
  const med = (i: number, field: 'name' | 'sig' | 'quantity', v: string) => set(`input[aria-label="Medicine ${i} ${field}"]`, v)

  it('needs at least one medicine', async () => {
    await mountForm()
    await rxMode()
    await pick()
    await set('#doctor', 'd2')
    expect(issueButton().attributes('disabled')).toBeDefined()
    await med(1, 'name', 'Amoxicillin 500mg')
    expect(issueButton().attributes('disabled')).toBeUndefined()
  })

  it('draws the medicines on the page and sends them trimmed, without blanks', async () => {
    mocks.issue.mockResolvedValue({ data: issuedDoc({ number: 'RX-000001', kind: 'prescription', layout: presetLayout('prescription', 'classic') }), error: null })
    await mountForm()
    await rxMode()
    await pick()
    await set('#doctor', 'd2')
    await med(1, 'name', '  Amoxicillin 500mg ')
    await med(1, 'sig', '1 cap TID x 7 days')
    await med(1, 'quantity', '#21')
    await wrapper.findAll('button').find(b => b.text().includes('Add medicine'))!.trigger('click')
    await wrapper.findAll('button').find(b => b.text().includes('Add medicine'))!.trigger('click') // a blank third row
    await med(2, 'name', 'Paracetamol')
    await set('#rx-diagnosis', 'URTI')

    expect(page().textContent).toContain('Amoxicillin 500mg')
    expect(page().textContent).toContain('1 cap TID x 7 days')
    expect(page().textContent).toContain('Dx: URTI')

    await issueButton().trigger('click')
    await flushPromises()
    const arg = mocks.issue.mock.calls[0][0]
    expect(arg.kind).toBe('prescription')
    expect(arg.layout.paper.size).toBe('a5')
    expect(arg.data.medicines).toEqual([
      { name: 'Amoxicillin 500mg', sig: '1 cap TID x 7 days', qty: '#21' },
      { name: 'Paracetamol', sig: '', qty: '' },
    ])
  })

  it('adds and removes medicine rows, always keeping one', async () => {
    await mountForm()
    await rxMode()
    expect(wrapper.findAll('input[aria-label$="name"]')).toHaveLength(1)
    await wrapper.findAll('button').find(b => b.text().includes('Add medicine'))!.trigger('click')
    expect(wrapper.findAll('input[aria-label$="name"]')).toHaveLength(2)
    await wrapper.find('button[aria-label="Remove medicine 2"]').trigger('click')
    await wrapper.find('button[aria-label="Remove medicine 1"]').trigger('click')
    expect(wrapper.findAll('input[aria-label$="name"]')).toHaveLength(1)
  })
})

describe('issue: opened from a patient chart', () => {
  it('starts with the patient chosen and the right document type', async () => {
    await mountForm({ initialPatientId: 'p1', initialKind: 'prescription' })
    expect(mocks.getPatient).toHaveBeenCalledWith('clinic-1', 'p1')
    expect(wrapper.find('.pick-patient').text()).toContain('Juan Dela Cruz')
    expect(wrapper.find('#rx-diagnosis').exists()).toBe(true)
    expect(wrapper.find('#purpose').exists()).toBe(false)
  })
})
