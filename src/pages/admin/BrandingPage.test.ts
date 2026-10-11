import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  auth: { clinic: null as any, user: { email: 'owner@clinic.test' }, loadClinic: vi.fn() },
  getClinicBranding: vi.fn(),
  updateBranding: vi.fn(),
  uploadLogo: vi.fn(),
  submit: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/services/clinic.service', () => ({
  clinicService: {
    getClinicBranding: mocks.getClinicBranding,
    updateBranding: mocks.updateBranding,
    uploadLogo: mocks.uploadLogo,
  },
}))
vi.mock('@/services/custom-theme.service', () => ({
  customThemeService: { submit: mocks.submit, list: mocks.list },
}))

import BrandingPage from './BrandingPage.vue'

const clinicOn = (plan: string) => ({
  id: 'clinic-1', name: 'Demo Clinic', slug: 'demo', plan, is_trial: false, trial_ends_at: null,
})

const branding = {
  clinic_id: 'clinic-1', logo_url: null, primary_color: '#0ea5e9', secondary_color: '#0369a1',
  layout: 'layout_a', banner_image: null,
}

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(BrandingPage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
}
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
const dirtyBar = () => wrapper.text().includes('You have unsaved changes')

beforeEach(() => {
  mocks.auth.clinic = clinicOn('premium')
  mocks.getClinicBranding.mockResolvedValue({ data: { ...branding }, error: null })
  mocks.updateBranding.mockResolvedValue({ data: branding, error: null })
  mocks.list.mockResolvedValue({ data: [], error: null })
  mocks.submit.mockResolvedValue({ data: { id: 'r1', status: 'new', created_at: '2026-10-11T00:00:00Z' }, error: null })
})

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('branding page: layouts', () => {
  it('no longer offers the custom design as a selectable layout', async () => {
    await mountPage()
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.map(r => (r.element as HTMLInputElement).value)).toEqual(['layout_a', 'layout_b', 'layout_c'])
    expect(wrapper.text()).not.toContain('Custom Design')
  })

  it('locks the Pro layouts on Starter and points to billing', async () => {
    mocks.auth.clinic = clinicOn('starter')
    await mountPage()
    const radios = wrapper.findAll('input[type="radio"]')
    expect((radios[0].element as HTMLInputElement).disabled).toBe(false)
    expect((radios[1].element as HTMLInputElement).disabled).toBe(true)
    expect((radios[2].element as HTMLInputElement).disabled).toBe(true)
    expect(wrapper.html()).toContain('href="/admin/billing"')
    expect(wrapper.html()).not.toContain('href="/billing"')
  })

  it('previews a layout with the colors being edited', async () => {
    await mountPage()
    const link = wrapper.findAll('a').find(a => a.text().includes('Preview'))!
    const href = link.attributes('href')!
    expect(href).toContain('/book/demo?')
    expect(href).toContain('preview=layout_a')
    expect(href).toContain('primary=%230ea5e9')
  })
})

describe('branding page: custom theme request', () => {
  it('lets Premium clinics open the request form', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('Custom theme, designed for you')
    await button('Request a custom theme')!.trigger('click')
    expect(wrapper.find('#req-message').exists()).toBe(true)
    expect((wrapper.find('#req-email').element as HTMLInputElement).value).toBe('owner@clinic.test')
  })

  it('shows Starter and Pro an upgrade link instead of the form', async () => {
    mocks.auth.clinic = clinicOn('pro')
    await mountPage()
    expect(button('Request a custom theme')).toBeUndefined()
    expect(wrapper.text()).toContain('Available on Premium')
  })

  it('needs a real message and email before it can be sent', async () => {
    await mountPage()
    await button('Request a custom theme')!.trigger('click')
    const send = () => wrapper.findAll('button').find(b => b.text().includes('Send request'))!
    expect(send().attributes('disabled')).toBeDefined()

    await wrapper.find('#req-message').setValue('too short')
    expect(send().attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('more characters needed')

    await wrapper.find('#req-message').setValue('We would like a calm green theme that matches our logo.')
    expect(send().attributes('disabled')).toBeUndefined()

    await wrapper.find('#req-email').setValue('not-an-email')
    expect(send().attributes('disabled')).toBeDefined()
  })

  it('sends the request and confirms', async () => {
    await mountPage()
    await button('Request a custom theme')!.trigger('click')
    await wrapper.find('#req-message').setValue('  We would like a calm green theme that matches our logo.  ')
    await wrapper.find('#req-ref').setValue('https://example.com/inspo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.submit).toHaveBeenCalledWith({
      message: 'We would like a calm green theme that matches our logo.',
      contact_email: 'owner@clinic.test',
      reference_url: 'https://example.com/inspo',
    })
    expect(wrapper.text()).toContain('Request sent')
    expect(wrapper.text()).toContain('owner@clinic.test')
    expect(mocks.list).toHaveBeenCalledTimes(2) // initial load + refresh after sending
  })

  it('omits an empty reference link', async () => {
    await mountPage()
    await button('Request a custom theme')!.trigger('click')
    await wrapper.find('#req-message').setValue('We would like a calm green theme that matches our logo.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.submit.mock.calls[0][0].reference_url).toBeUndefined()
  })

  it('shows the server error and keeps the form so they can retry', async () => {
    mocks.submit.mockResolvedValue({ data: null, error: "You've sent a few requests today already." })
    await mountPage()
    await button('Request a custom theme')!.trigger('click')
    await wrapper.find('#req-message').setValue('We would like a calm green theme that matches our logo.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain("You've sent a few requests today already.")
    expect(wrapper.find('#req-message').exists()).toBe(true)
  })

  it('lists earlier requests with their status', async () => {
    mocks.list.mockResolvedValue({
      data: [{ id: 'r1', clinic_id: 'clinic-1', contact_email: 'a@b.co', message: 'Green theme please, matching the logo.', reference_url: null, status: 'in_progress', created_at: '2026-10-01T00:00:00Z' }],
      error: null,
    })
    await mountPage()
    expect(wrapper.text()).toContain('In progress')
    expect(wrapper.text()).toContain('Green theme please')
  })
})

describe('branding page: colors and saving', () => {
  it('shows an unsaved-changes bar after picking a theme, and clears it on save', async () => {
    await mountPage()
    expect(dirtyBar()).toBe(false)
    await button('Rose')!.trigger('click')
    expect(dirtyBar()).toBe(true)

    await button('Save changes')!.trigger('click')
    await flushPromises()
    expect(mocks.updateBranding).toHaveBeenCalledWith('clinic-1', expect.objectContaining({
      layout: 'layout_a', primary_color: '#f43f5e', secondary_color: '#be123c',
    }))
    expect(dirtyBar()).toBe(false)
    expect(wrapper.text()).toContain('Branding saved')
  })

  it('discards changes back to what was saved', async () => {
    await mountPage()
    await button('Violet')!.trigger('click')
    expect(dirtyBar()).toBe(true)
    await button('Discard')!.trigger('click')
    expect(dirtyBar()).toBe(false)
    expect(wrapper.text()).toContain('#0ea5e9')
  })

  it('warns when white text would be hard to read on the chosen color', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('hard to read')
    await button('Amber')!.trigger('click')
    expect(wrapper.text()).toContain('hard to read')
  })

  it('shows save errors', async () => {
    mocks.updateBranding.mockResolvedValue({ data: null, error: 'permission denied' })
    await mountPage()
    await button('Teal')!.trigger('click')
    await button('Save changes')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('permission denied')
    expect(dirtyBar()).toBe(true)
  })

  it("doesn't send colors for a clinic without the Pro plan", async () => {
    mocks.auth.clinic = clinicOn('starter')
    await mountPage()
    // Starter can't use the preset buttons (disabled), so only the layout could change
    expect((button('Rose')!.element as HTMLButtonElement).disabled).toBe(true)
  })
})
