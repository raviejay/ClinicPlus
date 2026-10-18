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
  query: {} as Record<string, string>,
}))

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { clinicSlug: 'demo' }, query: mocks.query }) }))
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
  mocks.query = {}
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

const button = (text: string) => {
  const found = wrapper.findAll('button').find(b => b.text().includes(text))
  if (!found) throw new Error(`no button "${text}"`)
  return found
}

/** Layout B is a guided wizard: service, date and time, details, review */
async function walkToReview() {
  await button('Skip').trigger('click')
  await slotButton('9:00 AM').trigger('click')
  await button('Continue').trigger('click')
  await fillIn()
  await button('Continue').trigger('click')
}

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

describe('booking page: layouts and preview', () => {
  const proClinic = { ...clinic, plan: 'pro' }

  it('shows the classic layout for a clinic still set to the retired custom layout', async () => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: { ...clinic, plan: 'premium', clinic_branding: { ...clinic.clinic_branding, layout: 'layout_d' } }, error: null,
    })
    await mountPage()
    expect(wrapper.text()).not.toContain('Custom Layout')
    expect(wrapper.text()).toContain('Online Appointment Booking')
    expect(wrapper.find('#bk-name').exists()).toBe(true)
  })

  it('renders an unsaved layout and colors in preview mode, with booking turned off', async () => {
    mocks.query = { preview: 'layout_b', primary: '#f43f5e', secondary: '#be123c' }
    mocks.getClinicBySlug.mockResolvedValue({ data: proClinic, error: null })
    await mountPage()

    expect(wrapper.text()).toContain('Preview of your unsaved branding')
    expect(wrapper.text()).toContain('Book online') // guided layout hero
    expect(wrapper.html()).toContain('#f43f5e')
    expect(wrapper.html().toLowerCase()).not.toContain('#0ea5e9')

    await walkToReview()
    expect(confirmButton().attributes('disabled')).toBeDefined()
    await confirmButton().trigger('click')
    expect(mocks.bookPublic).not.toHaveBeenCalled()
  })

  it('ignores a malformed preview color and an unknown preview layout', async () => {
    mocks.query = { preview: 'layout_z', primary: 'javascript:alert(1)' }
    await mountPage()
    expect(wrapper.text()).not.toContain('Preview of your unsaved branding')
    expect(wrapper.html()).not.toContain('javascript:alert')
  })

  it('does not show the preview banner on the normal page', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('Preview of your unsaved branding')
  })
})

const withLayout = (layout: string, extra: Record<string, unknown> = {}) => ({
  ...clinic, plan: 'pro', ...extra,
  clinic_branding: { ...clinic.clinic_branding, layout },
})

describe('booking page: classic layout', () => {
  it('offers navigation to the clinic when it has an address', async () => {
    mocks.getClinicBySlug.mockResolvedValue({ data: { ...clinic, address: '12 Rizal Ave, Manila', phone: '0917 123 4567' }, error: null })
    await mountPage()
    const link = wrapper.findAll('a').find(a => a.text().includes('Navigate'))!
    expect(link.attributes('href')).toContain('destination=Demo%20Clinic%2C%2012%20Rizal%20Ave%2C%20Manila')
  })

  it('offers a call link when there is only a phone number', async () => {
    mocks.getClinicBySlug.mockResolvedValue({ data: { ...clinic, phone: '0917 123 4567' }, error: null })
    await mountPage()
    expect(wrapper.findAll('a').find(a => a.text().includes('Call'))!.attributes('href')).toBe('tel:09171234567')
  })

  it('shows every field of the form at once', async () => {
    await mountPage()
    for (const id of ['#bk-name', '#bk-phone', '#bk-email', '#bk-notes']) expect(wrapper.find(id).exists()).toBe(true)
  })
})

describe('booking page: guided cards layout', () => {
  beforeEach(() => {
    mocks.getClinicBySlug.mockResolvedValue({ data: withLayout('layout_b', { address: '12 Rizal Ave' }), error: null })
  })

  it('starts on the service step and shows one step at a time', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('What do you need?')
    expect(wrapper.find('#bk-name').exists()).toBe(false)
    expect(wrapper.text()).toContain('12 Rizal Ave')
  })

  it('will not continue from date & time until a time is chosen', async () => {
    await mountPage()
    await button('Skip').trigger('click')
    expect(button('Continue').attributes('disabled')).toBeDefined()
    await slotButton('9:00 AM').trigger('click')
    expect(button('Continue').attributes('disabled')).toBeUndefined()
  })

  it('will not continue from details until the name and phone are valid', async () => {
    await mountPage()
    await button('Skip').trigger('click')
    await slotButton('9:00 AM').trigger('click')
    await button('Continue').trigger('click')
    expect(button('Continue').attributes('disabled')).toBeDefined()
    await fillIn()
    expect(button('Continue').attributes('disabled')).toBeUndefined()
  })

  it('goes back without losing what was entered', async () => {
    await mountPage()
    await walkToReview()
    await button('Back').trigger('click')
    expect((wrapper.find('#bk-name').element as HTMLInputElement).value).toBe('Juan Dela Cruz')
  })

  it('reviews and books', async () => {
    await mountPage()
    await walkToReview()
    expect(wrapper.text()).toContain('Juan Dela Cruz')
    expect(wrapper.text()).toContain('9:00 AM')
    await confirmButton().trigger('click')
    await flushPromises()
    expect(mocks.bookPublic).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Juan Dela Cruz', time_slot: '9:00 AM' }))
    expect(wrapper.text()).toContain('All set!')
  })

  it('sends them back to choose another time when theirs was taken', async () => {
    await mountPage()
    await walkToReview()
    mocks.bookPublic.mockResolvedValue({ data: null, error: 'That time is already taken' })
    mocks.getPublicAvailability.mockResolvedValue(availability(['9:00 AM']))
    await confirmButton().trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('someone just booked that time')
    expect(wrapper.text()).toContain('Pick a date')
  })
})

describe('booking page: clinic showcase layout', () => {
  beforeEach(() => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: withLayout('layout_c', { address: '12 Rizal Ave, Manila', phone: '0917 123 4567' }), error: null,
    })
  })

  it('shows the clinic map for its address, with directions', async () => {
    await mountPage()
    const frame = wrapper.find('iframe')
    expect(frame.attributes('src')).toContain(encodeURIComponent('Demo Clinic, 12 Rizal Ave, Manila'))
    expect(frame.attributes('title')).toContain('Demo Clinic')
    const directions = wrapper.findAll('a').find(a => a.text().includes('Get directions'))!
    expect(directions.attributes('href')).toContain('destination=')
    expect(wrapper.text()).toContain('12 Rizal Ave, Manila')
    expect(wrapper.text()).toContain('0917 123 4567')
  })

  it('still shows a map from the clinic name when no address is set', async () => {
    mocks.getClinicBySlug.mockResolvedValue({ data: withLayout('layout_c'), error: null })
    await mountPage()
    expect(wrapper.find('iframe').attributes('src')).toContain(encodeURIComponent('Demo Clinic, Philippines'))
  })

  it('books from the same page', async () => {
    await mountPage()
    await fillIn()
    await slotButton('9:00 AM').trigger('click')
    await confirmButton().trigger('click')
    await flushPromises()
    expect(mocks.bookPublic).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Juan Dela Cruz', time_slot: '9:00 AM' }))
  })

  it('falls back to the classic layout on Starter', async () => {
    mocks.getClinicBySlug.mockResolvedValue({ data: withLayout('layout_c', { plan: 'starter' }), error: null })
    await mountPage()
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).toContain('Online Appointment Booking')
  })
})

// ── The clinic's own booking hours ──
import { DAY_KEYS, dayKeyOf, defaultBookingHours } from '@/utils/bookingHours'

const withHours = (mutate: (h: ReturnType<typeof defaultBookingHours>) => void, layout = 'layout_a') => {
  const hours = defaultBookingHours()
  mutate(hours)
  return {
    ...clinic, plan: 'pro',
    clinic_branding: { ...clinic.clinic_branding, layout },
    clinic_settings: { booking_mode: 'auto_assign', booking_hours: hours },
  }
}

describe('booking page: the clinic\'s booking hours', () => {
  it('offers the clinic\'s own times instead of the default ones', async () => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: withHours(h => {
        h.slot_minutes = 30
        DAY_KEYS.forEach(k => { h.days[k] = { open: true, start: '09:00', end: '11:00', break_start: null, break_end: null } })
      }), error: null,
    })
    await mountPage()
    for (const t of ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM']) expect(() => slotButton(t)).not.toThrow()
    expect(() => slotButton('8:00 AM')).toThrow()
    expect(() => slotButton('1:00 PM')).toThrow()
  })

  it('books a time from the clinic\'s own grid', async () => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: withHours(h => { h.slot_minutes = 30; DAY_KEYS.forEach(k => { h.days[k] = { open: true, start: '09:00', end: '11:00', break_start: null, break_end: null } }) }), error: null,
    })
    await mountPage()
    await fillIn()
    await slotButton('9:30 AM').trigger('click')
    await confirmButton().trigger('click')
    await flushPromises()
    expect(mocks.bookPublic).toHaveBeenCalledWith(expect.objectContaining({ time_slot: '9:30 AM' }))
  })

  it('shows the clinic\'s days and hours to the visitor', async () => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: withHours(h => { h.days.sun.open = false; h.days.sat.end = '12:00'; h.days.sat.break_start = null; h.days.sat.break_end = null }, 'layout_b'), error: null,
    })
    await mountPage()
    expect(wrapper.text()).toContain('Mon–Fri 8:00 AM – 5:00 PM')
    expect(wrapper.text()).toContain('Sat 8:00 AM – 12:00 PM')
    expect(wrapper.text()).toContain('Closed Sun')
  })

  it('starts on the next open day when the clinic is closed today', async () => {
    const todayKey = dayKeyOf(today)
    mocks.getClinicBySlug.mockResolvedValue({ data: withHours(h => { h.days[todayKey].open = false }), error: null })
    await mountPage()
    // the availability check is for the first day it IS open, not for today
    const asked = mocks.getPublicAvailability.mock.calls.map(c => c[0].date)
    expect(asked).not.toContain(today)
    expect(asked[0] > today).toBe(true)
  })

  it('does not let a closed day be chosen', async () => {
    const tomorrowKey = dayKeyOf(tomorrow)
    mocks.getClinicBySlug.mockResolvedValue({ data: withHours(h => { h.days[tomorrowKey].open = false }), error: null })
    await mountPage()
    const closedDay = wrapper.findAll('button').find(b => b.text().includes('Closed'))
    expect(closedDay).toBeTruthy()
    expect(closedDay!.attributes('disabled')).toBeDefined()
  })

  it('says so and offers the next open day if the chosen day is closed', async () => {
    const tomorrowKey = dayKeyOf(tomorrow)
    mocks.getClinicBySlug.mockResolvedValue({ data: withHours(h => { h.days[tomorrowKey].open = false }), error: null })
    await mountPage()
    // jump to the closed date through the date field
    const picker = wrapper.find('input[type="date"]')
    await picker.setValue(tomorrow)
    // closed dates are ignored: the page stays on a day that has times
    expect(wrapper.text()).not.toContain('The clinic is closed on this day.')
  })

  it('clears a chosen time that the next day does not offer', async () => {
    mocks.getClinicBySlug.mockResolvedValue({
      data: withHours(h => {
        h.days[dayKeyOf(today)] = { open: true, start: '08:00', end: '12:00', break_start: null, break_end: null }
        h.days[dayKeyOf(tomorrow)] = { open: true, start: '13:00', end: '16:00', break_start: null, break_end: null }
      }), error: null,
    })
    await mountPage()
    await slotButton('9:00 AM').trigger('click')
    expect(wrapper.text()).toContain('9:00 AM')
    await wrapper.findAll('button').find(b => b.text().startsWith('Tomorrow') || b.text().includes(tomorrow.slice(8)))!.trigger('click')
    await flushPromises()
    expect(confirmButton().attributes('disabled')).toBeDefined() // no time chosen any more
  })
})
