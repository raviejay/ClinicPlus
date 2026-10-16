import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthCalendar from './MonthCalendar.vue'
import ClinicMap from './ClinicMap.vue'

const mountCalendar = (modelValue = '2026-10-16', min = '2026-10-16') =>
  mount(MonthCalendar, { props: { modelValue, min, primaryColor: '#0ea5e9' } })

const day = (w: ReturnType<typeof mountCalendar>, n: number) =>
  w.findAll('button[aria-pressed]').find(b => b.text() === String(n))!

describe('month calendar', () => {
  it('shows the month of the chosen date', () => {
    expect(mountCalendar().text()).toContain('October 2026')
  })

  it('disables days before today and cannot go to earlier months', () => {
    const w = mountCalendar()
    expect(day(w, 15).attributes('disabled')).toBeDefined()
    expect(day(w, 16).attributes('disabled')).toBeUndefined()
    expect(w.find('[aria-label="Previous month"]').attributes('disabled')).toBeDefined()
  })

  it('emits the chosen date', async () => {
    const w = mountCalendar()
    await day(w, 20).trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual(['2026-10-20'])
  })

  it('moves between months', async () => {
    const w = mountCalendar()
    await w.find('[aria-label="Next month"]').trigger('click')
    expect(w.text()).toContain('November 2026')
  })

  it('follows the date when it is changed from outside', async () => {
    const w = mountCalendar()
    await w.setProps({ modelValue: '2026-12-02' })
    expect(w.text()).toContain('December 2026')
  })

  it('marks the chosen day as pressed', () => {
    expect(day(mountCalendar(), 16).attributes('aria-pressed')).toBe('true')
  })
})

describe('clinic map', () => {
  it('embeds the map for the query and links to directions', () => {
    const w = mount(ClinicMap, { props: { query: 'Demo, 1 Main St', name: 'Demo' } })
    expect(w.find('iframe').attributes('src')).toContain('output=embed')
    expect(w.find('iframe').attributes('src')).toContain(encodeURIComponent('Demo, 1 Main St'))
    const link = w.find('a')
    expect(link.attributes('href')).toContain('destination=')
    expect(link.attributes('rel')).toContain('noopener')
  })
})
