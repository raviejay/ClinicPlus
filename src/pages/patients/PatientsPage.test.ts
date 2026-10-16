import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ getAll: vi.fn(), getCount: vi.fn(), search: vi.fn() }))

vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ clinic: { id: 'c1' } }) }))
vi.mock('@/composables/useBranchFilter', () => ({ useBranchFilter: () => ({ watchBranchChange: vi.fn() }) }))
vi.mock('@/composables/useClinic', async () => {
  const { ref } = await import('vue')
  return { useClinic: () => ({ isReadOnly: ref(false) }) }
})
vi.mock('@/services/patient.service', () => ({
  patientService: { getAll: mocks.getAll, getCount: mocks.getCount, search: mocks.search },
}))

import PatientsPage from './PatientsPage.vue'

let n = 0
const patient = (over: Record<string, unknown>) => ({
  id: `p${++n}`, clinic_id: 'c1', branch_id: null, full_name: 'Someone', contact_number: '0917', email: 'x@y.ph',
  birthdate: '1990-01-01', gender: 'female', address: null, created_at: new Date().toISOString().replace('Z', ''), ...over,
})

const roster = [
  patient({ full_name: 'Ana Child', gender: 'female', birthdate: '2020-03-01' }),
  patient({ full_name: 'Ben Adult', gender: 'male', birthdate: '1985-06-06' }),
  patient({ full_name: 'Cora Senior', gender: 'female', birthdate: '1950-02-02' }),
  patient({ full_name: 'Dex Unknown', gender: null, birthdate: null, email: null }),
]

let wrapper: VueWrapper
const mountPage = async (list: unknown[] = roster) => {
  mocks.getAll.mockResolvedValue({ data: list, error: null })
  mocks.getCount.mockResolvedValue(list.length)
  wrapper = mount(PatientsPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
}
const rowNames = () => wrapper.findAll('a[href^="/patients/p"]').map(a => a.find('p').text())
const openFilters = async () => { await wrapper.findAll('button').find(b => b.text().includes('Filters'))!.trigger('click') }
const pick = async (id: string, value: string) => { await wrapper.find(`#${id}`).setValue(value) }

beforeEach(() => { mocks.search.mockResolvedValue({ data: [], error: null }) })
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

describe('patients page', () => {
  it('lists everyone, newest first, with age and gender', async () => {
    await mountPage()
    expect(rowNames()).toHaveLength(4)
    expect(wrapper.text()).toContain('4 total patients')
    expect(wrapper.text()).toContain('female')
    expect(wrapper.text()).toMatch(/\d+ yrs?/)
  })

  it('flags profiles with something missing', async () => {
    await mountPage()
    expect(wrapper.findAll('a').filter(a => a.text().includes('Incomplete'))).toHaveLength(1)
  })

  it('keeps the filters out of the way until asked, then filters by gender', async () => {
    await mountPage()
    expect(wrapper.find('#pf-gender').exists()).toBe(false)
    await openFilters()
    await pick('pf-gender', 'male')
    expect(rowNames()).toEqual(['Ben Adult'])
    expect(wrapper.text()).toContain('1 of 4 result')
  })

  it('filters by age group', async () => {
    await mountPage()
    await openFilters()
    await pick('pf-age', 'senior')
    expect(rowNames()).toEqual(['Cora Senior'])
    await pick('pf-age', 'unknown')
    expect(rowNames()).toEqual(['Dex Unknown'])
  })

  it('finds incomplete profiles', async () => {
    await mountPage()
    await openFilters()
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(rowNames()).toEqual(['Dex Unknown'])
  })

  it('shows active filters as chips that can be removed one by one or all at once', async () => {
    await mountPage()
    await openFilters()
    await pick('pf-gender', 'female')
    await pick('pf-age', 'child')
    expect(rowNames()).toEqual(['Ana Child'])
    const chips = wrapper.find('[aria-label="Active filters"]')
    expect(chips.text()).toContain('Female')
    expect(wrapper.text()).toMatch(/Filters\s*2/)
    await chips.findAll('button').find(b => b.text().startsWith('Female'))!.trigger('click')
    expect(rowNames()).toEqual(['Ana Child'])
    await wrapper.findAll('button').find(b => b.text() === 'Clear all')!.trigger('click')
    expect(rowNames()).toHaveLength(4)
    expect(wrapper.find('[aria-label="Active filters"]').exists()).toBe(false)
  })

  it('says so when filters leave nothing, and offers to clear them', async () => {
    await mountPage()
    await openFilters()
    await pick('pf-gender', 'other')
    expect(wrapper.text()).toContain('No patients match these filters')
    await wrapper.findAll('button').find(b => b.text() === 'Clear filters')!.trigger('click')
    expect(rowNames()).toHaveLength(4)
  })

  it('sorts by name and by age', async () => {
    await mountPage()
    await wrapper.find('[aria-label="Sort patients"]').setValue('name-desc')
    expect(rowNames()).toEqual(['Dex Unknown', 'Cora Senior', 'Ben Adult', 'Ana Child'])
    await wrapper.find('[aria-label="Sort patients"]').setValue('age-asc')
    expect(rowNames()).toEqual(['Ana Child', 'Ben Adult', 'Cora Senior', 'Dex Unknown'])
  })

  it('applies filters on top of search results', async () => {
    mocks.search.mockResolvedValue({ data: [roster[1], roster[2]], error: null })
    await mountPage()
    await openFilters()
    await pick('pf-gender', 'male')
    vi.useFakeTimers()
    await wrapper.find('input[type="search"]').setValue('en')
    await vi.advanceTimersByTimeAsync(400)
    vi.useRealTimers()
    await flushPromises()
    expect(mocks.search).toHaveBeenCalledWith('c1', 'en')
    expect(rowNames()).toEqual(['Ben Adult'])
  })

  it('shows 30 at a time with a button for the rest', async () => {
    const many = Array.from({ length: 45 }, (_, i) => patient({ full_name: `Patient ${String(i).padStart(2, '0')}` }))
    await mountPage(many)
    expect(rowNames()).toHaveLength(30)
    await wrapper.findAll('button').find(b => b.text().includes('Show more'))!.trigger('click')
    expect(rowNames()).toHaveLength(45)
  })

  it('still shows the first-patient prompt when there are none', async () => {
    await mountPage([])
    expect(wrapper.text()).toContain('No patients yet')
  })
})
