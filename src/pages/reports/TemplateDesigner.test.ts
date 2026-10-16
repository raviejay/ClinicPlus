import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { makeBox, makeImage, makeText } from '@/utils/documents/elements'
import { emptyLayout } from '@/utils/documents/sanitize'
import type { DocKind } from '@/utils/documents/types'

const mocks = vi.hoisted(() => ({
  auth: { clinic: { id: 'clinic-1', name: 'Demo Clinic' }, isAdmin: true },
  getTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  uploadImage: vi.fn(),
  getBranding: vi.fn(),
  printHtml: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 't1' } }), onBeforeRouteLeave: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/services/document.service', () => ({
  documentService: { getTemplate: mocks.getTemplate, updateTemplate: mocks.updateTemplate, uploadImage: mocks.uploadImage },
}))
vi.mock('@/services/clinic.service', () => ({ clinicService: { getClinicBranding: mocks.getBranding } }))
vi.mock('@/utils/receipt', async (orig) => ({ ...(await orig<typeof import('@/utils/receipt')>()), printHtmlDocument: mocks.printHtml }))

import TemplateDesigner from './TemplateDesigner.vue'

const template = (kind: DocKind = 'medcert', over: Record<string, unknown> = {}) => ({
  id: 't1', clinic_id: 'clinic-1', kind, name: 'My letterhead', is_default: false, created_at: '', updated_at: '',
  layout: { ...emptyLayout('a4'), elements: [makeText('a', 20, 30, 60, 10, 'Alpha {patient_name}'), makeBox('b', 20, 60, 40, 20)] },
  ...over,
})

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(TemplateDesigner, {
    attachTo: document.body,
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to" @click="$emit(\'click\', $event)"><slot /></a>' } } },
  })
  await flushPromises()
}
// Buttons carry an icon name before their label ("saveSave"), so match on how the text ends
const button = (text: string) => wrapper.findAll('button').find(b => b.text().trim().endsWith(text))
const layerRows = () => wrapper.findAll('ul[aria-label="Layers"] li button')
const layer = (text: string) => layerRows().find(b => b.text().includes(text))!
const key = (k: string, extra: Record<string, unknown> = {}) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }))
  return wrapper.vm.$nextTick()
}
const rect = (id: string) => {
  const style = (wrapper.find(`[data-id="${id}"]`).element as HTMLElement).style
  return { left: parseFloat(style.left), top: parseFloat(style.top) }
}

beforeEach(() => {
  mocks.getTemplate.mockResolvedValue({ data: template(), error: null })
  mocks.updateTemplate.mockResolvedValue({ data: template(), error: null })
  mocks.getBranding.mockResolvedValue({ data: { logo_url: 'https://cdn.test/logo.png', primary_color: '#10b981' }, error: null })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('designer: opening a template', () => {
  it('shows the template, its type and its elements', async () => {
    await mountPage()
    expect((wrapper.find('input[aria-label="Template name"]').element as HTMLInputElement).value).toBe('My letterhead')
    expect(wrapper.text()).toContain('Medical Certificate')
    expect(layerRows()).toHaveLength(2)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true)
  })
  it('says so when the template cannot be found', async () => {
    mocks.getTemplate.mockResolvedValue({ data: null, error: 'not found' })
    await mountPage()
    expect(wrapper.text()).toContain('could not be found')
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
  })
  it("refuses another clinic's template", async () => {
    mocks.getTemplate.mockResolvedValue({ data: template('medcert', { clinic_id: 'someone-else' }), error: null })
    await mountPage()
    expect(wrapper.text()).toContain('could not be found')
  })
  it('only offers the medicines list for prescriptions', async () => {
    await mountPage()
    expect(button('Medicines')).toBeUndefined()
    wrapper.unmount()
    mocks.getTemplate.mockResolvedValue({ data: template('prescription'), error: null })
    await mountPage()
    expect(wrapper.findAll('.add-btn').some(b => b.text().includes('Medicines'))).toBe(true)
  })
  it('starts clean, with nothing to save', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('Unsaved changes')
    expect(button('Save')!.attributes('disabled')).toBeDefined()
  })
})

describe('designer: editing', () => {
  it('adds an element and selects it', async () => {
    await mountPage()
    await wrapper.findAll('.add-btn').find(b => b.text().includes('Line'))!.trigger('click')
    expect(layerRows()).toHaveLength(3)
    expect(wrapper.text()).toContain('Unsaved changes')
    expect(wrapper.text()).toContain('Position & size')
  })
  it('selecting a layer shows its properties, and editing the text redraws the page', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    const box = wrapper.find('#el-content')
    expect((box.element as HTMLTextAreaElement).value).toBe('Alpha {patient_name}')
    await box.setValue('Changed text')
    expect(wrapper.find('[data-test="canvas"]').html()).toContain('Changed text')
    expect(wrapper.text()).toContain('Unsaved changes')
  })
  it('warns about a field name that does not exist', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await wrapper.find('#el-content').setValue('Hello {patinet_name}')
    expect(wrapper.text()).toContain('Not a known field')
    expect(wrapper.text()).toContain('{patinet_name}')
  })
  it('changes the paper from the page settings', async () => {
    await mountPage()
    await wrapper.find('#paper-size').setValue('letter')
    const canvas = wrapper.find('[data-test="canvas"]').element as HTMLElement
    expect(parseFloat(canvas.style.width) / parseFloat(canvas.style.height)).toBeCloseTo(215.9 / 279.4, 2)
  })
})

describe('designer: inserting fields', () => {
  it('puts the field at the cursor in the selected text', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    const box = wrapper.find('#el-content').element as HTMLTextAreaElement
    box.setSelectionRange(5, 5) // after "Alpha"
    await wrapper.findAll('aside button').find(b => b.text() === 'Doctor name')!.trigger('click')
    expect((wrapper.find('#el-content').element as HTMLTextAreaElement).value).toBe('Alpha{doctor_name} {patient_name}')
  })
  it('makes a new text box when no text is selected', async () => {
    await mountPage()
    expect(layerRows()).toHaveLength(2)
    await wrapper.findAll('aside button').find(b => b.text() === 'Date (long)')!.trigger('click')
    expect(layerRows()).toHaveLength(3)
    expect((wrapper.find('#el-content').element as HTMLTextAreaElement).value).toBe('{date}')
  })
  it('lists only the fields that make sense for this document', async () => {
    await mountPage()
    const labels = wrapper.findAll('aside button').map(b => b.text())
    expect(labels).toContain('Rest sentence') // certificate field
    expect(labels).not.toContain('Follow-up line') // prescription field
  })
})

describe('designer: keyboard', () => {
  it('nudges the selected element by 1 mm, or 5 mm with Shift', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    const before = rect('a')
    await key('ArrowRight')
    expect(rect('a').left).toBeGreaterThan(before.left)
    const mid = rect('a')
    await key('ArrowDown', { shiftKey: true })
    expect(rect('a').top).toBeGreaterThan(mid.top)
    // (x shown in the position field, in mm)
    expect((wrapper.find('input[aria-label="X"]').element as HTMLInputElement).value).toBe('21')
  })
  it('deletes the selected element', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await key('Delete')
    expect(layerRows()).toHaveLength(1)
  })
  it('undoes and redoes', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await key('Delete')
    expect(layerRows()).toHaveLength(1)
    await key('z', { ctrlKey: true })
    expect(layerRows()).toHaveLength(2)
    await key('y', { ctrlKey: true })
    expect(layerRows()).toHaveLength(1)
  })
  it('duplicates with Ctrl+D', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await key('d', { ctrlKey: true })
    expect(layerRows()).toHaveLength(3)
  })
  it('deselects with Escape', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    expect(wrapper.text()).toContain('Position & size')
    await key('Escape')
    expect(wrapper.text()).toContain('Safe margin guide')
  })
  it('does not steal keys while typing in a field', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    const box = wrapper.find('#el-content').element
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(layerRows()).toHaveLength(2)
  })
  it("won't nudge a locked element", async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await wrapper.find('button[aria-label="Lock"]').trigger('click')
    await key('ArrowRight')
    expect((wrapper.find('input[aria-label="X"]').element as HTMLInputElement).value).toBe('20')
  })
  it('enables the undo and redo buttons only when they can do something', async () => {
    await mountPage()
    const undo = () => wrapper.find('button[aria-label="Undo"]')
    const redo = () => wrapper.find('button[aria-label="Redo"]')
    expect(undo().attributes('disabled')).toBeDefined()
    await wrapper.findAll('.add-btn')[0].trigger('click')
    expect(undo().attributes('disabled')).toBeUndefined()
    await undo().trigger('click')
    expect(redo().attributes('disabled')).toBeUndefined()
  })
})

describe('designer: saving', () => {
  it('saves the layout and the name, then shows it is saved', async () => {
    await mountPage()
    await layer('Alpha').trigger('click')
    await wrapper.find('#el-content').setValue('New wording')
    await button('Save')!.trigger('click')
    await flushPromises()

    expect(mocks.updateTemplate).toHaveBeenCalledTimes(1)
    const [id, patch] = mocks.updateTemplate.mock.calls[0]
    expect(id).toBe('t1')
    expect(patch.name).toBe('My letterhead')
    expect(patch.layout.elements[0].content).toBe('New wording')
    expect(wrapper.text()).toContain('Saved')
    expect(wrapper.text()).not.toContain('Unsaved changes')
    expect(button('Save')!.attributes('disabled')).toBeDefined()
  })
  it('saves a new name on its own', async () => {
    await mountPage()
    await wrapper.find('input[aria-label="Template name"]').setValue('  Renamed  ')
    expect(wrapper.text()).toContain('Unsaved changes')
    await button('Save')!.trigger('click')
    await flushPromises()
    expect(mocks.updateTemplate.mock.calls[0][1].name).toBe('Renamed')
  })
  it('will not save without a name', async () => {
    await mountPage()
    await wrapper.find('input[aria-label="Template name"]').setValue('   ')
    await button('Save')!.trigger('click')
    expect(mocks.updateTemplate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Give the template a name')
  })
  it('shows a save error and stays unsaved', async () => {
    mocks.updateTemplate.mockResolvedValue({ data: null, error: 'permission denied' })
    await mountPage()
    await wrapper.findAll('.add-btn')[0].trigger('click')
    await button('Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('permission denied')
    expect(wrapper.text()).toContain('Unsaved changes')
  })
  it('saves with Ctrl+S', async () => {
    await mountPage()
    await wrapper.findAll('.add-btn')[0].trigger('click')
    await key('s', { ctrlKey: true })
    await flushPromises()
    expect(mocks.updateTemplate).toHaveBeenCalledTimes(1)
  })
})

describe('designer: starting points, zoom and preview', () => {
  it('replaces the design with a starting point after confirming', async () => {
    await mountPage()
    await wrapper.findAll('aside button').find(b => b.text().startsWith('Classic'))!.trigger('click')
    expect(window.confirm).toHaveBeenCalled()
    expect(layerRows().length).toBeGreaterThan(8)
  })
  it('keeps the design if the replacement is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await mountPage()
    await wrapper.findAll('aside button').find(b => b.text().startsWith('Classic'))!.trigger('click')
    expect(layerRows()).toHaveLength(2)
  })
  it('uses the clinic accent color for the starting point', async () => {
    await mountPage()
    await wrapper.findAll('aside button').find(b => b.text().startsWith('Modern'))!.trigger('click')
    expect(wrapper.find('[data-test="canvas"]').html()).toContain('#10b981')
  })
  it('zooms in and out', async () => {
    await mountPage()
    const percent = () => parseInt(wrapper.find('button[title="Fit to width"]').text())
    const start = percent()
    await wrapper.find('button[aria-label="Zoom in"]').trigger('click')
    expect(percent()).toBeGreaterThan(start)
    await wrapper.find('button[aria-label="Zoom out"]').trigger('click')
    await wrapper.find('button[aria-label="Zoom out"]').trigger('click')
    expect(percent()).toBeLessThan(start)
  })
  it('previews with sample details and prints a test page', async () => {
    await mountPage()
    await button('Preview')!.trigger('click')
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Juan Dela Cruz') // sample patient name in the template text
    await dialog.findAll('button').find(b => b.text().includes('Print test page'))!.trigger('click')
    expect(mocks.printHtml).toHaveBeenCalledTimes(1)
    expect(mocks.printHtml.mock.calls[0][0]).toContain('@page { size: 210mm 297mm')
  })
})

describe('designer: images', () => {
  const withImage = (source: any = { kind: 'clinic_logo' }) => ({
    data: template('medcert', { layout: { ...emptyLayout('a4'), elements: [makeImage('pic', 20, 20, 30, 30, { source })] } }),
    error: null,
  })
  const chooseFile = async (file: File) => {
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await flushPromises()
  }
  const png = () => new File(['x'], 'sig.png', { type: 'image/png' })

  it('uploads a picture and uses it', async () => {
    mocks.getTemplate.mockResolvedValue(withImage())
    mocks.uploadImage.mockResolvedValue({ data: 'https://cdn.test/documents/clinic-1/sig.png', error: null })
    await mountPage()
    await layer('Clinic logo').trigger('click')
    await chooseFile(png())
    expect(mocks.uploadImage).toHaveBeenCalledWith('clinic-1', expect.any(File))
    expect(wrapper.find('[data-test="canvas"]').html()).toContain('https://cdn.test/documents/clinic-1/sig.png')
    expect(wrapper.text()).toContain('Unsaved changes')
  })
  it('shows why an upload failed and leaves the image alone', async () => {
    mocks.getTemplate.mockResolvedValue(withImage())
    mocks.uploadImage.mockResolvedValue({ data: null, error: 'The image must be under 1.5 MB.' })
    await mountPage()
    await layer('Clinic logo').trigger('click')
    await chooseFile(png())
    expect(wrapper.text()).toContain('under 1.5 MB')
    expect(wrapper.text()).not.toContain('Unsaved changes')
  })
  it('can switch back to the clinic logo', async () => {
    mocks.getTemplate.mockResolvedValue(withImage({ kind: 'url', url: 'https://cdn.test/a.png' }))
    await mountPage()
    await layer('Image').trigger('click')
    await wrapper.findAll('button').find(b => b.text() === 'Clinic logo' && b.attributes('aria-pressed') !== undefined)!.trigger('click')
    expect(wrapper.text()).toContain('Uses the logo from Branding')
  })
})
