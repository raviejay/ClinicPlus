import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { manilaToday, addDays } from '@/utils/booking'
import DateStrip from './DateStrip.vue'

const mocks = vi.hoisted(() => ({
  getClinicBySlug: vi.fn(),
  getCategories: vi.fn(),
  getPublicAvailability: vi.fn(),
  getPublicDoctors: vi.fn(),
  bookPublic: vi.fn(),
  getPublicBySlug: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { clinicSlug: 'demo' } }) }))
vi.mock('@/services/clinic.service', () => ({ clinicService: { getClinicBySlug: mocks.getClinicBySlug } }))
vi.mock('@/services/clinic-services.service', () => ({ clinicServicesService: { getCategories: mocks.getCategories } }))
vi.mock('@/services/branch.service', () => ({ branchService: { getPublicBySlug: mocks.getPublicBySlug } }))
vi.mock('@/services/appointment.service', () => ({
  appointmentService: {
    getPublicAvailability: mocks.getPublicAvailability,
    getPublicDoctors: mocks.getPublicDoctors,
    bookPublic: mocks.bookPublic,
  },
}))

import BookingPage from './BookingPage.vue'

const today = manilaToday()
const tomorrow = addDays(today, 1)

const clinic = {
  id: 'clinic-1', name: 'Demo Clinic', slug: 'demo', email: null, plan: 'starter', status: 'active',
  is_trial: false, trial_ends_at: null, created_at: '2026-01-01',
  clinic_branding: { layout: 'layout_a', primary_color: '#0EA5E9', secondary_color: '#0369A1' },
  clinic_settings: { booking_mode: 'auto_assign' },
}

const availability = (booked: string[] = [], minutes = 0, day = today) =>
  ({ data: { booked, today: day, minutes }, error: null })

let wrapper: VueWrapper

const slotButton = (label: string) => {
  const found = wrapper.findAll('button').find(b => b.text().startsWith(label))
  if (!found) throw new Error(`no slot button "${label}"`)
  return found
}
const confirmButton = () => wrapper.findAll('button').find(b => b.text().includes('Confirm Appointment'))!

async function mountPage() {
  wrapper = mount(BookingPage, { attachTo: document.body })
  await flushPromises()
}

async function fillIn() {
  await wrapper.find('#bk-name').setValue('Juan Dela Cruz')
  await wrapper.find('#bk-phone').setValue('0917 123 4567')
}

beforeEach(() => {
  mocks.getClinicBySlug.mockResolvedValue({ data: clinic, error: null })
  mocks.getCategories.mockResolvedValue({ data: [], error: null })
  mocks.getPublicDoctors.mockResolvedValue([])
  mocks.getPublicBySlug.mockResolvedValue({ data: null, error: null })
  mocks.getPublicAvailability.mockResolvedValue(availability())
  mocks.bookPublic.mockResolvedValue({ data: { appointment_id: 'abcd1234-0000-0000-0000-000000000000' }, error: null })
})

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('booking page: availability', () => {
  it('asks the server which times are taken for the chosen date', async () => {
    await mountPage()
    expect(mocks.getPublicAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ clinic_id: 'clinic-1', date: today }),
    )
  })

  it('shows a taken time as Booked and does not let it be selected', async () => {
    mocks.getPublicAvailability.mockResolvedValue(availability(['9:00 AM']))
    await mountPage()
    const taken = slotButton('9:00 AM')
    expect(taken.text()).toContain('Booked')
    expect(taken.attributes('disabled')).toBeDefined()
    expect(slotButton('10:00 AM').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('7 of 8 available')
  })

  it("grays out today's times that have already passed", async () => {
    mocks.getPublicAvailability.mockResolvedValue(availability([], 10 * 60 + 5)) // 10:05 AM
    await mountPage()
    for (const label of ['8:00 AM', '9:00 AM', '10:00 AM']) {
      expect(slotButton(label).text()).toContain('Passed')
      expect(slotButton(label).attributes('disabled')).toBeDefined()
    }
    expect(slotButton('11:00 AM').attributes('disabled')).toBeUndefined()
  })

  it('offers the next day when nothing is left', async () => {
    mocks.getPublicAvailability.mockResolvedValue(availability([], 23 * 60))
    await mountPage()
    expect(wrapper.text()).toContain('No times left on this date')
    const next = wrapper.findAll('button').find(b => b.text().includes('Try next day'))!
    await next.trigger('click')
    await flushPromises()
    expect(mocks.getPublicAvailability).toHaveBeenLastCalledWith(expect.objectContaining({ date: tomorrow }))
  })

  it('reloads availability when the date changes', async () => {
    await mountPage()
    wrapper.findComponent(DateStrip).vm.$emit('update:modelValue', tomorrow)
    await flushPromises()
    expect(mocks.getPublicAvailability).toHaveBeenLastCalledWith(expect.objectContaining({ date: tomorrow }))
  })

  it('refreshes when the tab becomes visible again, and drops a time someone else took', async () => {
    await mountPage()
    await slotButton('2:00 PM').trigger('click')
    expect(slotButton('2:00 PM').attributes('aria-pressed')).toBe('true')

    mocks.getPublicAvailability.mockResolvedValue(availability(['2:00 PM']))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(wrapper.text()).toContain('2:00 PM is no longer available')
    expect(slotButton('2:00 PM').attributes('aria-pressed')).toBe('false')
  })

  it('still lets people book if the availability check fails', async () => {
    mocks.getPublicAvailability.mockResolvedValue({ data: null, error: 'network' })
    await mountPage()
    expect(wrapper.text()).toContain("Couldn't check live availability")
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    expect(confirmButton().attributes('disabled')).toBeUndefined()
  })
})

describe('booking page: form', () => {
  it('needs a name, a valid phone number and a time before it can be submitted', async () => {
    await mountPage()
    expect(confirmButton().attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Still needed: your name, a valid phone number, a time')

    await fillIn()
    expect(confirmButton().attributes('disabled')).toBeDefined()
    await slotButton('9:00 AM').trigger('click')
    expect(confirmButton().attributes('disabled')).toBeUndefined()
  })

  it('shows inline errors only after leaving a field', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('Enter a valid phone number')
    await wrapper.find('#bk-phone').setValue('12')
    await wrapper.find('#bk-phone').trigger('blur')
    expect(wrapper.text()).toContain('Enter a valid phone number')
  })

  it('rejects a malformed email', async () => {
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    await wrapper.find('#bk-email').setValue('not-an-email')
    expect(confirmButton().attributes('disabled')).toBeDefined()
  })

  it("uses the clinic's own services when it has set them up", async () => {
    mocks.getCategories.mockResolvedValue({
      data: [{ id: 'dental', label: 'Dental Care', icon: '🦷', services: ['Cleaning'] }], error: null,
    })
    await mountPage()
    expect(wrapper.text()).toContain('Dental Care')
    expect(wrapper.text()).not.toContain('Consultation')
  })

  it('falls back to the built-in services when the clinic has none', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('Consultation')
  })
})

describe('booking page: confirming', () => {
  it('sends the booking and shows a reference code', async () => {
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    await confirmButton().trigger('click')
    await flushPromises()

    expect(mocks.bookPublic).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: 'clinic-1', full_name: 'Juan Dela Cruz', contact_number: '0917 123 4567',
      appointment_date: today, time_slot: '9:00 AM',
    }))
    expect(wrapper.text()).toContain('All set!')
    expect(wrapper.text()).toContain('ABCD1234')
  })

  it('downloads a calendar file from the confirmation screen', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}) // jsdom can't navigate
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    await confirmButton().trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find(b => b.text().includes('Add to calendar'))!.trigger('click')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('recovers when someone else books the same time first', async () => {
    mocks.bookPublic.mockResolvedValue({ data: null, error: 'That time slot is already taken. Please choose another time.' })
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')

    mocks.getPublicAvailability.mockResolvedValue(availability(['9:00 AM']))
    await confirmButton().trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('someone just booked that time')
    expect(wrapper.text()).not.toContain('All set!')
    expect(slotButton('9:00 AM').text()).toContain('Booked')
    expect(confirmButton().attributes('disabled')).toBeDefined() // time was cleared; must pick again
  })

  it('shows other server errors as an error', async () => {
    mocks.bookPublic.mockResolvedValue({ data: null, error: 'Too many booking attempts. Please try again later.' })
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    await confirmButton().trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Too many booking attempts')
  })
})
