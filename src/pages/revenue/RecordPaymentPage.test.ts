import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { addDays, manilaToday } from '@/utils/booking'

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  auth: { clinic: { id: 'clinic-1', name: 'Demo Clinic' }, profile: { full_name: 'Ana' } },
  branch: { branches: [] as any[], isViewingAll: true, activeBranchId: null as string | null },
  patient: { id: 'p1', clinic_id: 'clinic-1', full_name: 'Juan Dela Cruz', contact_number: '0917', branch_id: null } as any,
  create: vi.fn(),
  getByPatient: vi.fn(),
  getPatient: vi.fn(),
  getAppointments: vi.fn(),
  getCategories: vi.fn(),
  printReceipt: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRoute: () => ({ query: mocks.query }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/branch', () => ({ useBranchStore: () => mocks.branch }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/components/ui/PatientLookup.vue', () => ({
  default: {
    props: ['modelValue', 'label', 'required'],
    emits: ['update:modelValue'],
    template: '<button type="button" class="pick-patient" @click="$emit(\'update:modelValue\', $options.patient())">{{ modelValue ? modelValue.full_name : \'Choose patient\' }}</button>',
    methods: {},
    patient: () => mocks.patient,
  },
}))
vi.mock('@/services/payment.service', () => ({ paymentService: { create: mocks.create, getByPatient: mocks.getByPatient } }))
vi.mock('@/services/patient.service', () => ({ patientService: { getById: mocks.getPatient } }))
vi.mock('@/services/appointment.service', () => ({ appointmentService: { getByPatient: mocks.getAppointments } }))
vi.mock('@/services/clinic-services.service', () => ({ clinicServicesService: { getCategories: mocks.getCategories } }))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printReceipt: mocks.printReceipt }))

import RecordPaymentPage from './RecordPaymentPage.vue'

const today = manilaToday()
const utc = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString().replace('Z', '')

const visit = (id: string, over: Record<string, unknown> = {}) => ({
  id, appointment_date: today, time_slot: '9:00 AM', service_name: 'Check-up', status: 'completed', branch_id: null,
  profiles: { full_name: 'Reyes' }, ...over,
})

const savedPayment = (over: Record<string, unknown> = {}) => ({
  id: 'pay-1', clinic_id: 'clinic-1', patient_id: 'p1', amount: 500, payment_method: 'cash', status: 'paid',
  paid_at: utc(0), created_at: utc(0), receipt_number: 'R-000042', description: null, reference: null, branch_id: null, ...over,
})

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(RecordPaymentPage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
}
const pickPatient = async () => { await wrapper.find('.pick-patient').trigger('click'); await flushPromises() }
const save = () => wrapper.findAll('button').find(b => /Confirm Payment|Record anyway|Recording/.test(b.text()))!
// Payment method buttons (emoji + label)
const method = (label: string) => wrapper.findAll('[role="radio"]').find(b => b.text().includes(label))

beforeEach(() => {
  mocks.query = {}
  mocks.branch = { branches: [], isViewingAll: true, activeBranchId: null }
  mocks.patient = { id: 'p1', clinic_id: 'clinic-1', full_name: 'Juan Dela Cruz', contact_number: '0917', branch_id: null }
  mocks.getAppointments.mockResolvedValue({ data: [], error: null })
  mocks.getByPatient.mockResolvedValue({ data: [], error: null })
  mocks.getPatient.mockResolvedValue({ data: mocks.patient, error: null })
  mocks.getCategories.mockResolvedValue({ data: [{ id: 'c', label: 'Consult', icon: '🩺', services: ['Check-up', 'Vaccination'] }], error: null })
  mocks.create.mockResolvedValue({ data: savedPayment(), error: null })
})

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('record payment: form', () => {
  it('needs a patient and a positive amount', async () => {
    await mountPage()
    expect(save().attributes('disabled')).toBeDefined()
    await pickPatient()
    expect(save().attributes('disabled')).toBeDefined()
    await wrapper.find('#pay-amount').setValue(0)
    expect(save().attributes('disabled')).toBeDefined()
    await wrapper.find('#pay-amount').setValue(250)
    expect(save().attributes('disabled')).toBeUndefined()
  })

  it('rejects absurd amounts', async () => {
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(99_999_999)
    expect(save().attributes('disabled')).toBeDefined()
  })

  it('fills the amount from the quick buttons', async () => {
    await mountPage()
    await wrapper.findAll('button').find(b => b.text() === '₱500')!.trigger('click')
    expect((wrapper.find('#pay-amount').element as HTMLInputElement).value).toBe('500')
  })

  it('asks for a reference number only for non-cash methods', async () => {
    await mountPage()
    expect(wrapper.find('#pay-ref').exists()).toBe(false)
    await method('GCash')!.trigger('click')
    expect(wrapper.find('#pay-ref').exists()).toBe(true)
    await method('Cash')!.trigger('click')
    expect(wrapper.find('#pay-ref').exists()).toBe(false)
  })

  it('suggests the clinic\'s own services for the description', async () => {
    await mountPage()
    const options = wrapper.findAll('#pay-services option').map(o => o.attributes('value'))
    expect(options).toEqual(['Check-up', 'Vaccination'])
  })

  it('shows a note field on request', async () => {
    await mountPage()
    expect(wrapper.find('#pay-notes').exists()).toBe(false)
    await wrapper.findAll('button').find(b => b.text().includes('Add a note'))!.trigger('click')
    expect(wrapper.find('#pay-notes').exists()).toBe(true)
  })
})

describe('record payment: saving', () => {
  it('records the payment with everything entered', async () => {
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(1250.5)
    await method('GCash')!.trigger('click')
    await wrapper.find('#pay-ref').setValue('  GC-777  ')
    await wrapper.find('#pay-desc').setValue('Vaccination')
    await wrapper.findAll('button').find(b => b.text().includes('Add a note'))!.trigger('click')
    await wrapper.find('#pay-notes').setValue('paid by mother')
    await save().trigger('click')
    await flushPromises()

    expect(mocks.create).toHaveBeenCalledWith({
      clinic_id: 'clinic-1', patient_id: 'p1', appointment_id: undefined, branch_id: null,
      amount: 1250.5, payment_method: 'gcash', description: 'Vaccination', reference: 'GC-777', notes: 'paid by mother',
    })
  })

  it('shows the receipt number and offers to print it', async () => {
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    await save().trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Payment recorded')
    expect(wrapper.text()).toContain('R-000042')
    expect(wrapper.text()).toContain('₱500.00')
    await wrapper.findAll('button').find(b => b.text().includes('Print receipt'))!.trigger('click')
    expect(mocks.printReceipt).toHaveBeenCalledWith(expect.objectContaining({
      receiptNumber: 'R-000042', patientName: 'Juan Dela Cruz', amount: 500, recordedBy: 'Ana', clinicName: 'Demo Clinic',
    }))
  })

  it('lets staff record another payment from a clean form', async () => {
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    await save().trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text().includes('Record another'))!.trigger('click')
    expect(wrapper.text()).not.toContain('Payment recorded')
    expect((wrapper.find('#pay-amount').element as HTMLInputElement).value).toBe('0')
    expect(wrapper.find('.pick-patient').text()).toContain('Choose patient')
  })

  it('shows the error and keeps the form if saving fails', async () => {
    mocks.create.mockResolvedValue({ data: null, error: 'permission denied' })
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    await save().trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('permission denied')
    expect(wrapper.text()).not.toContain('Payment recorded')
    expect(wrapper.find('#pay-amount').exists()).toBe(true)
  })

  it('does not record twice while saving', async () => {
    let finish: (v: unknown) => void = () => {}
    mocks.create.mockReturnValue(new Promise(r => { finish = r }))
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    await save().trigger('click')
    await save().trigger('click')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    finish({ data: savedPayment(), error: null })
    await flushPromises()
  })
})

describe('record payment: linking to a visit', () => {
  it('lists recent visits and marks the paid ones', async () => {
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1'), visit('a2', { service_name: 'Lab test' }), visit('a3', { status: 'cancelled' })], error: null })
    mocks.getByPatient.mockResolvedValue({ data: [savedPayment({ appointment_id: 'a2', status: 'paid', paid_at: utc(60 * 24 * 2) })], error: null })
    await mountPage()
    await pickPatient()
    expect(wrapper.text()).toContain('Which visit is this for?')
    expect(wrapper.text()).toContain('Check-up')
    expect(wrapper.text()).toContain('Lab test')
    expect(wrapper.text()).toContain('Dr. Reyes')
    const paidRow = wrapper.findAll('[role="radio"]').find(b => b.text().includes('Lab test'))!
    expect(paidRow.attributes('disabled')).toBeDefined()
    expect(paidRow.text()).toContain('Paid')
    expect(wrapper.findAll('[role="radio"]').filter(b => b.text().includes('Check-up'))).toHaveLength(1) // cancelled one is not offered
  })

  it('uses the chosen visit for the payment, its service and its branch', async () => {
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1', { branch_id: 'branch-9' })], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Check-up'))!.trigger('click')
    expect((wrapper.find('#pay-desc').element as HTMLInputElement).value).toBe('Check-up')
    await wrapper.find('#pay-amount').setValue(800)
    await save().trigger('click')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ appointment_id: 'a1', branch_id: 'branch-9', description: 'Check-up' }))
  })

  it("keeps what the cashier typed instead of overwriting it with the visit's service", async () => {
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1')], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-desc').setValue('Check-up + medicine')
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Check-up'))!.trigger('click')
    expect((wrapper.find('#pay-desc').element as HTMLInputElement).value).toBe('Check-up + medicine')
  })

  it('can be left unlinked for a walk-in', async () => {
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1')], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Check-up'))!.trigger('click')
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Walk-in'))!.trigger('click')
    await wrapper.find('#pay-amount').setValue(100)
    await save().trigger('click')
    await flushPromises()
    expect(mocks.create.mock.calls[0][0].appointment_id).toBeUndefined()
  })

  it('arrives with the patient and visit chosen when opened from "Collect"', async () => {
    mocks.query = { patient: 'p1', appointment: 'a1' }
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1'), visit('a2')], error: null })
    await mountPage()
    expect(mocks.getPatient).toHaveBeenCalledWith('clinic-1', 'p1')
    expect(wrapper.find('.pick-patient').text()).toContain('Juan Dela Cruz')
    const chosen = wrapper.findAll('[role="radio"]').find(b => b.attributes('aria-checked') === 'true')!
    expect(chosen.text()).toContain('Check-up')
    expect((wrapper.find('#pay-desc').element as HTMLInputElement).value).toBe('Check-up')
  })

  it("does not preselect a visit that is already paid", async () => {
    mocks.query = { patient: 'p1', appointment: 'a1' }
    mocks.getAppointments.mockResolvedValue({ data: [visit('a1')], error: null })
    mocks.getByPatient.mockResolvedValue({ data: [savedPayment({ appointment_id: 'a1', paid_at: utc(60 * 24) })], error: null })
    await mountPage()
    expect(wrapper.findAll('[role="radio"]').some(b => b.attributes('aria-checked') === 'true' && b.text().includes('Check-up'))).toBe(false)
  })
})

describe('record payment: branch', () => {
  const recordWith = async () => {
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(100)
    await save().trigger('click')
    await flushPromises()
    return mocks.create.mock.calls[0][0].branch_id
  }

  it("uses the patient's branch", async () => {
    mocks.patient = { ...mocks.patient, branch_id: 'branch-3' }
    expect(await recordWith()).toBe('branch-3')
  })

  it('uses the branch being viewed when the patient has none', async () => {
    mocks.branch = { branches: [], isViewingAll: false, activeBranchId: 'branch-5' }
    expect(await recordWith()).toBe('branch-5')
  })

  it('is the main clinic when viewing all branches and nothing else says otherwise', async () => {
    expect(await recordWith()).toBeNull()
  })
})

describe('record payment: duplicates', () => {
  it('warns about the same amount recorded moments ago, and lets staff continue deliberately', async () => {
    mocks.getByPatient.mockResolvedValue({ data: [savedPayment({ amount: 500, paid_at: utc(1) })], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    expect(wrapper.text()).toContain('was just recorded for Juan Dela Cruz')
    expect(save().text()).toContain('Record anyway')
    await save().trigger('click')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('stays quiet for a different amount or an older payment', async () => {
    mocks.getByPatient.mockResolvedValue({ data: [savedPayment({ amount: 500, paid_at: utc(30) })], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    expect(wrapper.text()).not.toContain('was just recorded')
    await wrapper.find('#pay-amount').setValue(600)
    expect(wrapper.text()).not.toContain('was just recorded')
  })

  it("ignores refunded or voided payments when checking", async () => {
    mocks.getByPatient.mockResolvedValue({ data: [savedPayment({ amount: 500, paid_at: utc(1), status: 'voided' })], error: null })
    await mountPage()
    await pickPatient()
    await wrapper.find('#pay-amount').setValue(500)
    expect(wrapper.text()).not.toContain('was just recorded')
  })
})

// Keeps the helper imports honest
void addDays
