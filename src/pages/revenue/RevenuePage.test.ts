import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { addDays, manilaToday } from '@/utils/booking'

const mocks = vi.hoisted(() => ({
  auth: { clinic: { id: 'clinic-1', name: 'Demo Clinic' } as any, user: { id: 'user-1' }, isAdmin: true, profile: { full_name: 'Ana' } },
  getReport: vi.fn(),
  getRange: vi.fn(),
  getUnpaid: vi.fn(),
  markNoCharge: vi.fn(),
  refund: vi.fn(),
  voidPayment: vi.fn(),
  exportExcel: vi.fn(),
  printReceipt: vi.fn(),
  printHtml: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/branch', () => ({ useBranchStore: () => ({ branches: [], activeBranch: null, isViewingAll: true }) }))
vi.mock('@/composables/useBranchFilter', () => ({ useBranchFilter: () => ({ watchBranchChange: vi.fn() }) }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/components/ui/FeatureGate.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('./RevenueTrendChart.vue', () => ({ default: { template: '<div data-test="chart"></div>' } }))
vi.mock('@/services/payment.service', () => ({
  paymentService: {
    getReport: mocks.getReport, getRange: mocks.getRange, getUnpaid: mocks.getUnpaid,
    markNoCharge: mocks.markNoCharge, refund: mocks.refund, void: mocks.voidPayment,
  },
}))
vi.mock('@/utils/revenueExport', () => ({ exportRevenueToExcel: mocks.exportExcel }))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printReceipt: mocks.printReceipt, printHtmlDocument: mocks.printHtml }))

import RevenuePage from './RevenuePage.vue'

const today = manilaToday()
const yesterday = addDays(today, -1)
const weekAgo = addDays(today, -6)

const report = (net: number, over: Record<string, unknown> = {}) => ({
  data: {
    totals: { net, count: net > 0 ? 3 : 0, patients: net > 0 ? 2 : 0, average: net > 0 ? net / 3 : 0 },
    refunds: { amount: 0, count: 0 },
    daily: net > 0 ? [{ date: today, amount: net, count: 3 }] : [],
    by_method: net > 0 ? [{ method: 'cash', amount: net, count: 3 }] : [],
    by_doctor: [], by_service: net > 0 ? [{ service: 'Check-up', amount: net, count: 3 }] : [], by_branch: [],
    ...over,
  },
  error: null,
})

// A UTC time that is `minutesAgo` minutes before now, in the database's no-zone format
const utc = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString().replace('Z', '')

const payment = (id: string, over: Record<string, unknown> = {}) => ({
  id, clinic_id: 'clinic-1', branch_id: null, patient_id: 'p1', appointment_id: null,
  amount: 500, payment_method: 'cash', status: 'paid', paid_at: utc(10), created_at: utc(10),
  description: null, notes: null, reference: null, receipt_number: `R-00000${id.slice(-1)}`, recorded_by: 'user-1',
  status_reason: null, status_changed_at: null, status_changed_by: null,
  patients: { full_name: `Patient ${id}`, contact_number: '0917' }, appointments: null,
  recorder: { full_name: 'Ana' }, changer: null, ...over,
})

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(RevenuePage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>' } } } })
  await flushPromises()
}
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
// Exact label, for short words that also appear inside other buttons ("Void" vs the "Voided" filter)
const exact = (text: string) => wrapper.findAll('button').find(b => b.text().trim() === text)

beforeEach(() => {
  mocks.auth.isAdmin = true
  mocks.getReport.mockImplementation(async (range: { from: string }) => (range.from === yesterday ? report(1000) : report(1500)))
  mocks.getRange.mockResolvedValue({ data: [payment('p1'), payment('p2', { amount: 1000, payment_method: 'gcash', reference: 'GC-1' })], error: null })
  mocks.getUnpaid.mockResolvedValue({ data: [], error: null })
  mocks.markNoCharge.mockResolvedValue({ data: null, error: null })
  mocks.refund.mockResolvedValue({ data: {}, error: null })
  mocks.voidPayment.mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('revenue page: summary', () => {
  it("loads today's report and the day before for comparison", async () => {
    await mountPage()
    expect(mocks.getReport).toHaveBeenCalledWith({ from: today, to: today })
    expect(mocks.getReport).toHaveBeenCalledWith({ from: yesterday, to: yesterday })
    expect(wrapper.text()).toContain('₱1,500.00')
    expect(wrapper.text()).toContain('2 patients')
  })

  it('shows the change against the previous period', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.text()).toContain('vs previous day (₱1,000.00)')
  })

  it('says "New" when there was nothing to compare against', async () => {
    mocks.getReport.mockImplementation(async (range: { from: string }) => (range.from === yesterday ? report(0) : report(800)))
    await mountPage()
    expect(wrapper.text()).toContain('New')
  })

  it('shows a clean empty state', async () => {
    mocks.getReport.mockResolvedValue(report(0))
    mocks.getRange.mockResolvedValue({ data: [], error: null })
    await mountPage()
    expect(wrapper.text()).toContain('₱0.00')
    expect(wrapper.text()).toContain('No payments in this period')
  })

  it('shows breakdowns by method and service', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('By payment method')
    expect(wrapper.text()).toContain('Cash')
    expect(wrapper.text()).toContain('By service')
    expect(wrapper.text()).toContain('Check-up')
  })

  it('shows an error with a retry', async () => {
    mocks.getReport.mockResolvedValueOnce({ data: null, error: 'boom' }).mockResolvedValueOnce({ data: null, error: 'boom' })
    await mountPage()
    expect(wrapper.text()).toContain('boom')
    mocks.getReport.mockImplementation(async () => report(900))
    await button('Retry')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('₱900.00')
  })
})

describe('revenue page: periods', () => {
  it('hides the trend chart for a single day and shows it for longer periods', async () => {
    await mountPage()
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
    await button('Last 7 days')!.trigger('click')
    await flushPromises()
    expect(mocks.getReport).toHaveBeenCalledWith({ from: weekAgo, to: today })
    expect(mocks.getReport).toHaveBeenCalledWith({ from: addDays(weekAgo, -7), to: addDays(weekAgo, -1) })
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('vs previous 7 days')
  })

  it('does not load an invalid custom range', async () => {
    await mountPage()
    mocks.getReport.mockClear()
    await button('Custom')!.trigger('click')
    await flushPromises()
    const [from, to] = wrapper.findAll('input[type="date"]')
    await from.setValue(today)
    await to.setValue(yesterday) // end before start
    await flushPromises()
    expect(wrapper.text()).toContain('Pick a valid range')
    expect(mocks.getReport).not.toHaveBeenCalledWith({ from: today, to: yesterday })
  })
})

describe('revenue page: transactions', () => {
  it('lists payments with receipt numbers, and tucks voided ones away', async () => {
    mocks.getRange.mockResolvedValue({
      data: [payment('p1'), payment('p2', { status: 'voided', amount: 999 }), payment('p3', { status: 'refunded', amount: 400 })], error: null,
    })
    await mountPage()
    expect(wrapper.text()).toContain('Patient p1')
    expect(wrapper.text()).toContain('R-000001')
    expect(wrapper.text()).toContain('Patient p3')
    expect(wrapper.text()).toContain('Refunded')
    expect(wrapper.text()).not.toContain('Patient p2')

    await button('Voided')!.trigger('click')
    expect(wrapper.text()).toContain('Patient p2')
    expect(wrapper.text()).not.toContain('Patient p1')
  })

  it('totals each day by paid payments only', async () => {
    mocks.getRange.mockResolvedValue({ data: [payment('p1', { amount: 300 }), payment('p2', { amount: 200 }), payment('p3', { amount: 900, status: 'refunded' })], error: null })
    await mountPage()
    // one day group whose total is 300 + 200, refund excluded
    expect(wrapper.text()).toContain('₱500.00')
  })

  it('searches by patient, receipt number and reference', async () => {
    await mountPage()
    const search = wrapper.find('input[type="search"]')
    await search.setValue('GC-1')
    expect(wrapper.text()).toContain('Patient p2')
    expect(wrapper.text()).not.toContain('Patient p1')
    await search.setValue('R-000001')
    expect(wrapper.text()).toContain('Patient p1')
    await search.setValue('nobody')
    expect(wrapper.text()).toContain('No transactions match')
  })
})

describe('revenue page: payment details, refunds and voids', () => {
  const open = async (p = 'Patient p1') => {
    await wrapper.findAll('li button').find(b => b.text().includes(p))!.trigger('click')
    await flushPromises()
  }

  it('opens the payment with its receipt number and details', async () => {
    await mountPage()
    await open()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('R-000001')
    expect(wrapper.text()).toContain('Recorded by')
    expect(wrapper.text()).toContain('Print receipt')
  })

  it('prints the receipt', async () => {
    await mountPage()
    await open()
    await button('Print receipt')!.trigger('click')
    expect(mocks.printReceipt).toHaveBeenCalledWith(expect.objectContaining({ receiptNumber: 'R-000001', patientName: 'Patient p1', amount: 500 }))
  })

  it('lets an admin refund with a reason, then refreshes', async () => {
    await mountPage()
    await open()
    await exact('Refund')!.trigger('click')
    const confirm = () => wrapper.findAll('button').find(b => b.text().includes('Confirm refund'))!
    expect(confirm().attributes('disabled')).toBeDefined() // needs a reason
    await wrapper.find('#status-reason').setValue('Service cancelled')
    mocks.getReport.mockClear()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.refund).toHaveBeenCalledWith('p1', 'Service cancelled')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(mocks.getReport).toHaveBeenCalled()
  })

  it('shows the server message if a refund is refused', async () => {
    mocks.refund.mockResolvedValue({ data: null, error: 'Only paid payments can be refunded' })
    await mountPage()
    await open()
    await exact('Refund')!.trigger('click')
    await wrapper.find('#status-reason').setValue('Service cancelled')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Only paid payments can be refunded')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('lets an admin void a payment', async () => {
    await mountPage()
    await open()
    await exact('Void')!.trigger('click')
    await wrapper.find('#status-reason').setValue('Typed the wrong amount')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.voidPayment).toHaveBeenCalledWith('p1', 'Typed the wrong amount')
  })

  it('does not offer refunds to staff, but lets them void their own fresh entry', async () => {
    mocks.auth.isAdmin = false
    await mountPage()
    await open() // p1 was recorded by this user 10 minutes ago
    expect(exact('Refund')).toBeUndefined()
    expect(exact('Void')).toBeDefined()
  })

  it("does not let staff void someone else's payment or an old one", async () => {
    mocks.auth.isAdmin = false
    mocks.getRange.mockResolvedValue({
      data: [payment('p1', { recorded_by: 'someone-else' }), payment('p2', { created_at: utc(60), paid_at: utc(60) })], error: null,
    })
    await mountPage()
    await open('Patient p1')
    expect(exact('Void')).toBeUndefined()
    expect(wrapper.text()).toContain('Only an admin can refund or void')
    await button('Close')?.trigger('click')
    wrapper.findAll('[aria-label="Close"]')[0]?.trigger('click')
    await flushPromises()
    await open('Patient p2')
    expect(exact('Void')).toBeUndefined()
  })

  it('shows why a refunded payment was refunded', async () => {
    mocks.getRange.mockResolvedValue({
      data: [payment('p1', { status: 'refunded', status_reason: 'Patient was charged twice', changer: { full_name: 'Boss' }, status_changed_at: utc(5) })], error: null,
    })
    await mountPage()
    await open()
    expect(wrapper.text()).toContain('Patient was charged twice')
    expect(wrapper.text()).toContain('Boss')
    expect(exact('Refund')).toBeUndefined()
    expect(exact('Void')).toBeUndefined()
  })
})

describe('revenue page: to collect', () => {
  const owed = {
    appointment_id: 'a1', appointment_date: today, time_slot: '9:00 AM', patient_id: 'p9', patient_name: 'Maria Owed',
    contact_number: '0918', service_name: 'Check-up', doctor_name: 'Reyes', branch_id: null,
  }

  it('lists completed visits nobody has paid for', async () => {
    mocks.getUnpaid.mockResolvedValue({ data: [owed], error: null })
    await mountPage()
    expect(wrapper.text()).toContain('To collect')
    expect(wrapper.text()).toContain('Maria Owed')
    expect(wrapper.text()).toContain('Dr. Reyes')
    expect(mocks.getUnpaid).toHaveBeenCalledWith({ from: addDays(today, -30), to: today })
  })

  it('links "Collect" to the payment form with the visit and patient chosen', async () => {
    mocks.getUnpaid.mockResolvedValue({ data: [owed], error: null })
    await mountPage()
    const link = wrapper.findAll('a').find(a => a.text() === 'Collect')!
    expect(link.attributes('href')).toContain('"appointment":"a1"')
    expect(link.attributes('href')).toContain('"patient":"p9"')
  })

  it('marks a visit as no charge and removes it', async () => {
    mocks.getUnpaid.mockResolvedValue({ data: [owed], error: null })
    await mountPage()
    await button('No charge')!.trigger('click')
    await flushPromises()
    expect(mocks.markNoCharge).toHaveBeenCalledWith('a1')
    expect(wrapper.text()).not.toContain('Maria Owed')
  })

  it('hides the section when nothing is owed', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('To collect')
  })
})

describe('revenue page: end of day and export', () => {
  it('summarises the day and works out the cash difference', async () => {
    await mountPage()
    await button('End of day')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('End-of-day summary')
    expect(wrapper.text()).toContain('Cash expected in drawer')
    // p1 (₱500 cash) is the only cash payment
    await wrapper.find('#cash-counted').setValue('450')
    expect(wrapper.text()).toContain('Short by ₱50.00')
    await wrapper.find('#cash-counted').setValue('500')
    expect(wrapper.text()).toContain('Balanced')
    await wrapper.find('#cash-counted').setValue('530')
    expect(wrapper.text()).toContain('Over by ₱30.00')
  })

  it('prints the end-of-day summary', async () => {
    await mountPage()
    await button('End of day')!.trigger('click')
    await wrapper.find('#cash-counted').setValue('500')
    await button('Print summary')!.trigger('click')
    expect(mocks.printHtml).toHaveBeenCalledTimes(1)
    expect(mocks.printHtml.mock.calls[0][0]).toContain('End-of-day summary')
  })

  it('offers the end-of-day summary only for a single day', async () => {
    await mountPage()
    expect(button('End of day')).toBeDefined()
    await button('Last 7 days')!.trigger('click')
    await flushPromises()
    expect(button('End of day')).toBeUndefined()
  })

  it('exports every payment in the period, not just the visible page', async () => {
    await mountPage()
    mocks.getRange.mockClear()
    await button('Export')!.trigger('click')
    await flushPromises()
    expect(mocks.getRange).toHaveBeenCalledWith('clinic-1', { from: today, to: today }, 5000)
    expect(mocks.exportExcel).toHaveBeenCalledWith(expect.objectContaining({ clinicName: 'Demo Clinic', range: { from: today, to: today } }))
  })
})
