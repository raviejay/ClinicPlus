import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { presetLayout } from '@/utils/documents/presets'

const mocks = vi.hoisted(() => ({
  auth: { clinic: { id: 'clinic-1', name: 'Demo' }, isAdmin: true },
  push: vi.fn(),
  listTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getBranding: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/services/document.service', () => ({
  documentService: {
    listTemplates: mocks.listTemplates, createTemplate: mocks.createTemplate,
    updateTemplate: mocks.updateTemplate, deleteTemplate: mocks.deleteTemplate,
  },
}))
vi.mock('@/services/clinic.service', () => ({ clinicService: { getClinicBranding: mocks.getBranding } }))
vi.mock('./DocumentPreview.vue', () => ({ default: { template: '<div class="preview-stub"></div>' } }))

import TemplateManager from './TemplateManager.vue'

const tpl = (id: string, kind: 'medcert' | 'prescription', name: string, isDefault = false) => ({
  id, clinic_id: 'clinic-1', kind, name, is_default: isDefault, created_at: '', updated_at: '',
  layout: presetLayout(kind, 'classic'),
})

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(TemplateManager, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
}
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
const card = (name: string) => wrapper.findAll('article').find(a => a.text().includes(name))!

beforeEach(() => {
  mocks.auth.isAdmin = true
  mocks.listTemplates.mockResolvedValue({ data: [], error: null })
  mocks.getBranding.mockResolvedValue({ data: { logo_url: null, primary_color: '#10b981' }, error: null })
  mocks.createTemplate.mockResolvedValue({ data: tpl('new-1', 'medcert', 'x'), error: null })
  mocks.updateTemplate.mockResolvedValue({ data: tpl('t1', 'medcert', 'x'), error: null })
  mocks.deleteTemplate.mockResolvedValue({ data: null, error: null })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.clearAllMocks() })

describe('templates: the list', () => {
  it('explains the built-in design when there are no templates yet', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('No custom templates yet')
    expect(button('Create your first template')).toBeDefined()
  })

  it('groups templates by type and marks the default', async () => {
    mocks.listTemplates.mockResolvedValue({
      data: [tpl('t1', 'medcert', 'Clinic letterhead', true), tpl('t2', 'medcert', 'Plain paper'), tpl('t3', 'prescription', 'Rx pad', true)],
      error: null,
    })
    await mountPage()
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(wrapper.text()).toContain('Medical Certificate')
    expect(wrapper.text()).toContain('Prescription (Rx)')
    expect(card('Clinic letterhead').text()).toContain('Default')
    expect(card('Plain paper').text()).not.toContain('Default')
    expect(card('Rx pad').text()).toContain('A5')
  })

  it('shows an error if the templates cannot be loaded', async () => {
    mocks.listTemplates.mockResolvedValue({ data: null, error: 'boom' })
    await mountPage()
    expect(wrapper.text()).toContain('boom')
  })
})

describe('templates: who can change them', () => {
  beforeEach(() => {
    mocks.listTemplates.mockResolvedValue({ data: [tpl('t1', 'medcert', 'Clinic letterhead', true)], error: null })
  })

  it('lets an admin edit, duplicate and delete', async () => {
    await mountPage()
    const c = card('Clinic letterhead')
    expect(c.text()).toContain('Edit design')
    expect(c.text()).toContain('Duplicate')
    expect(c.text()).toContain('Delete')
    expect(button('New template')).toBeDefined()
  })

  it('shows everyone else a read-only list', async () => {
    mocks.auth.isAdmin = false
    await mountPage()
    expect(wrapper.text()).toContain('Only the clinic admin can design')
    expect(card('Clinic letterhead').text()).not.toContain('Edit design')
    expect(button('New template')).toBeUndefined()
    expect(button('Delete')).toBeUndefined()
  })

  it('links the edit button to the designer', async () => {
    await mountPage()
    expect(card('Clinic letterhead').find('a').attributes('href')).toBe('/reports/design/t1')
  })
})

describe('templates: actions', () => {
  beforeEach(() => {
    mocks.listTemplates.mockResolvedValue({
      data: [tpl('t1', 'medcert', 'Clinic letterhead', true), tpl('t2', 'medcert', 'Plain paper')], error: null,
    })
  })

  it('makes a template the default and reloads', async () => {
    await mountPage()
    mocks.listTemplates.mockClear()
    await card('Plain paper').findAll('button').find(b => b.text() === 'Make default')!.trigger('click')
    await flushPromises()
    expect(mocks.updateTemplate).toHaveBeenCalledWith('t2', { is_default: true })
    expect(mocks.listTemplates).toHaveBeenCalled()
  })

  it('duplicates a template with the same layout and a new name', async () => {
    await mountPage()
    await card('Plain paper').findAll('button').find(b => b.text() === 'Duplicate')!.trigger('click')
    await flushPromises()
    expect(mocks.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: 'clinic-1', kind: 'medcert', name: 'Plain paper (copy)', layout: presetLayout('medcert', 'classic'),
    }))
    expect(mocks.createTemplate.mock.calls[0][0].is_default).toBeUndefined() // a copy never takes over as default
  })

  it('deletes only after confirming', async () => {
    await mountPage()
    await card('Plain paper').findAll('button').find(b => b.text() === 'Delete')!.trigger('click')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.deleteTemplate).toHaveBeenCalledWith('t2')
  })

  it('keeps the template if deleting is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await mountPage()
    await card('Plain paper').findAll('button').find(b => b.text() === 'Delete')!.trigger('click')
    expect(mocks.deleteTemplate).not.toHaveBeenCalled()
  })

  it('shows an error if an action fails', async () => {
    mocks.updateTemplate.mockResolvedValue({ data: null, error: 'permission denied' })
    await mountPage()
    await card('Plain paper').findAll('button').find(b => b.text() === 'Make default')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('permission denied')
  })
})

describe('templates: creating one', () => {
  const open = async () => { await button('New template')!.trigger('click') }
  const submit = async () => { await wrapper.find('form').trigger('submit'); await flushPromises() }

  it('needs a name', async () => {
    await mountPage()
    await open()
    const create = () => wrapper.findAll('button').find(b => b.text().includes('Create and design'))!
    expect(create().attributes('disabled')).toBeDefined()
    await wrapper.find('input[placeholder^="e.g."]').setValue('Letterhead')
    expect(create().attributes('disabled')).toBeUndefined()
  })

  it('creates a certificate from a starting point and opens the designer', async () => {
    await mountPage()
    await open()
    await wrapper.find('input[placeholder^="e.g."]').setValue('  Clinic letterhead  ')
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Modern'))!.trigger('click')
    await submit()

    const arg = mocks.createTemplate.mock.calls[0][0]
    expect(arg).toMatchObject({ clinic_id: 'clinic-1', kind: 'medcert', name: '  Clinic letterhead  ' })
    expect(arg.layout).toEqual(presetLayout('medcert', 'modern', { accent: '#10b981', paper: 'a4' }))
    expect(arg.is_default).toBe(true) // the first template of its kind
    expect(mocks.push).toHaveBeenCalledWith('/reports/design/new-1')
  })

  it('switches to A5 for prescriptions and uses that paper', async () => {
    await mountPage()
    await open()
    await wrapper.findAll('[role="radio"]').find(b => b.text().includes('Prescription'))!.trigger('click')
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('a5')
    await wrapper.find('input[placeholder^="e.g."]').setValue('Rx pad')
    await submit()
    expect(mocks.createTemplate.mock.calls[0][0]).toMatchObject({ kind: 'prescription' })
    expect(mocks.createTemplate.mock.calls[0][0].layout.paper.size).toBe('a5')
  })

  it("doesn't take over as default when that type already has one", async () => {
    mocks.listTemplates.mockResolvedValue({ data: [tpl('t1', 'medcert', 'Existing', true)], error: null })
    await mountPage()
    await open()
    await wrapper.find('input[placeholder^="e.g."]').setValue('Second')
    await submit()
    expect(mocks.createTemplate.mock.calls[0][0].is_default).toBe(false)
  })

  it('shows the reason when creating fails and stays open', async () => {
    mocks.createTemplate.mockResolvedValue({ data: null, error: 'You can keep up to 20 templates. Delete one you no longer use.' })
    await mountPage()
    await open()
    await wrapper.find('input[placeholder^="e.g."]').setValue('One more')
    await submit()
    expect(wrapper.text()).toContain('up to 20 templates')
    expect(mocks.push).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})
