import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import BookingHoursEditor from './BookingHoursEditor.vue'
import { defaultBookingHours, type BookingHours } from '@/utils/bookingHours'

let wrapper: VueWrapper
let current: { value: BookingHours }

// A parent that holds the value, like the Settings page does
function mountEditor(start: BookingHours = defaultBookingHours()) {
  const Host = defineComponent({
    components: { BookingHoursEditor },
    setup() { const hours = ref(start); current = hours; return { hours } },
    template: '<BookingHoursEditor v-model="hours" />',
  })
  wrapper = mount(Host, { attachTo: document.body })
}
afterEach(() => wrapper?.unmount())

const day = (key: string) => wrapper.find(`[data-day="${key}"]`)
const setTime = async (label: string, value: string) => {
  const input = wrapper.find(`input[aria-label="${label}"]`)
  await input.setValue(value)
}

describe('booking hours editor', () => {
  it('starts from the clinic\'s current hours and previews the times patients will see', () => {
    mountEditor()
    expect(wrapper.find('[data-testid="preview-count"]').text()).toContain('Monday: 8 appointment times')
    expect(wrapper.find('[aria-label="Appointment times"]').text()).toContain('8:00 – 9:00 AM')
    expect(wrapper.find('[aria-label="Appointment times"]').text()).not.toContain('12:00 PM – 1:00 PM') // lunch
  })

  it('changes how long an appointment is, and the preview follows', async () => {
    mountEditor()
    await wrapper.find('#bh-length').setValue('30')
    expect(current.value.slot_minutes).toBe(30)
    expect(wrapper.find('[data-testid="preview-count"]').text()).toContain('16 appointment times')
  })

  it('takes any length in 5-minute steps, not only the common ones', async () => {
    mountEditor()
    await wrapper.find('#bh-length').setValue('25')
    expect(current.value.slot_minutes).toBe(25)
    expect(wrapper.find('[aria-label="Appointment times"]').text()).toContain('8:00 – 8:25 AM')
  })

  it('offers one-tap common lengths', async () => {
    mountEditor()
    await wrapper.find('[aria-label="Common lengths"]').findAll('button').find(b => b.text() === '45 min')!.trigger('click')
    expect(current.value.slot_minutes).toBe(45)
  })

  it('lets a day use its own length, and clearing it goes back to the clinic-wide one', async () => {
    mountEditor()
    const box = wrapper.find('input[aria-label="Saturday appointment length in minutes"]')
    expect(box.attributes('placeholder')).toBe('60')
    await box.setValue('30')
    expect(current.value.days.sat.slot_minutes).toBe(30)
    await box.setValue('')
    expect(current.value.days.sat.slot_minutes).toBeUndefined()
  })

  it('shows each time as the whole appointment in the preview', async () => {
    mountEditor()
    await wrapper.find('#bh-length').setValue('30')
    expect(wrapper.find('[aria-label="Appointment times"]').text()).toContain('8:00 – 8:30 AM')
    expect(wrapper.find('[aria-label="Appointment times"]').text()).toContain('8:30 – 9:00 AM')
  })

  it('warns about a length outside 5-240 minutes', async () => {
    mountEditor()
    await wrapper.find('#bh-length').setValue('17')
    expect(wrapper.text()).toContain('5 to 240 minutes')
  })

  it('changes opening and closing times', async () => {
    mountEditor()
    await setTime('Monday opens', '09:00')
    await setTime('Monday closes', '12:00')
    expect(current.value.days.mon.start).toBe('09:00')
    expect(current.value.days.mon.end).toBe('12:00')
  })

  it('closes a day', async () => {
    mountEditor()
    await day('sun').find('[role="switch"]').trigger('click')
    expect(current.value.days.sun.open).toBe(false)
    expect(day('sun').text()).toContain('Closed')
    expect(day('sun').find('input[type="time"]').exists()).toBe(false)
    await wrapper.findAll('[role="tab"]').find(t => t.text() === 'Sun')!.trigger('click')
    expect(wrapper.find('[data-testid="preview-count"]').text()).toContain('Sunday: closed')
  })

  it('adds and removes a break', async () => {
    mountEditor()
    expect(day('mon').find('input[aria-label="Monday break starts"]').exists()).toBe(true) // the default has lunch
    await day('mon').find('input[type="checkbox"]').setValue(false)
    expect(current.value.days.mon.break_start).toBeNull()
    expect(current.value.days.mon.break_end).toBeNull()
    await day('mon').find('input[type="checkbox"]').setValue(true)
    expect(current.value.days.mon.break_start).toBe('12:00')
    expect(current.value.days.mon.break_end).toBe('13:00')
  })

  it('copies the first open day to the other open days, leaving closed ones alone', async () => {
    mountEditor()
    await day('sun').find('[role="switch"]').trigger('click')
    await setTime('Monday opens', '10:00')
    await setTime('Monday closes', '15:00')
    await wrapper.findAll('button').find(b => b.text().startsWith('Copy Monday'))!.trigger('click')
    expect(current.value.days.fri.start).toBe('10:00')
    expect(current.value.days.fri.end).toBe('15:00')
    expect(current.value.days.sun.open).toBe(false)
    expect(current.value.days.sun.start).toBe('08:00') // untouched
  })

  it('explains a day that does not make sense, right under it', async () => {
    mountEditor()
    await setTime('Tuesday opens', '17:00')
    await setTime('Tuesday closes', '08:00')
    expect(day('tue').find('[role="alert"]').text()).toContain('Closing time must be after opening time')
    expect(day('mon').find('[role="alert"]').exists()).toBe(false)
  })

  it('will not let every day be closed without saying so', async () => {
    mountEditor()
    for (const k of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) await day(k).find('[role="switch"]').trigger('click')
    expect(wrapper.text()).toContain('Open at least one day')
  })

  it('adds closed dates in order, and removes them', async () => {
    mountEditor()
    const input = wrapper.find('input[aria-label="Date to close"]')
    await input.setValue('2099-12-25')
    await wrapper.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
    await input.setValue('2099-11-01')
    await wrapper.findAll('button').find(b => b.text() === 'Add')!.trigger('click')
    expect(current.value.closed_dates).toEqual(['2099-11-01', '2099-12-25'])
    expect(wrapper.find('[aria-label="Closed dates"]').text()).toContain('December 25, 2099')
    await wrapper.find('[aria-label="Remove Friday, December 25, 2099"]').trigger('click')
    expect(current.value.closed_dates).toEqual(['2099-11-01'])
  })

  it('does not add an empty date twice', async () => {
    mountEditor()
    const add = wrapper.findAll('button').find(b => b.text() === 'Add')!
    expect(add.attributes('disabled')).toBeDefined()
  })

  it('resets to the default hours', async () => {
    mountEditor()
    await wrapper.find('#bh-length').setValue('45')
    await wrapper.findAll('button').find(b => b.text().startsWith('Reset to the default'))!.trigger('click')
    expect(current.value).toEqual(defaultBookingHours())
  })
})
