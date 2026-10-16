import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ auth: null as any, upload: vi.fn(), remove: vi.fn(), loadProfile: vi.fn() }))

vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/services/supabase', () => ({ supabase: {} }))
vi.mock('@/services/avatar.service', () => ({ avatarService: { upload: mocks.upload, remove: mocks.remove } }))
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  mocks.auth = reactive({
    user: { id: 'u1', email: 'me@clinic.ph' },
    profile: { id: 'u1', full_name: 'Maria', role: 'staff', avatar_url: null as string | null },
    loadProfile: (...a: unknown[]) => mocks.loadProfile(...a),
  })
  return { useAuthStore: () => mocks.auth }
})

import ProfilePage from './ProfilePage.vue'

const PHOTO = 'https://proj.supabase.co/storage/v1/object/public/avatars/u1/123.jpg'
let wrapper: VueWrapper
const mountPage = async () => { wrapper = mount(ProfilePage, { attachTo: document.body }); await flushPromises() }
const choose = async (file: File) => {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  mocks.auth.profile.avatar_url = null
  mocks.upload.mockResolvedValue({ data: PHOTO, error: null })
  mocks.remove.mockResolvedValue({ data: null, error: null })
  mocks.loadProfile.mockImplementation(async () => { mocks.auth.profile.avatar_url = PHOTO })
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

describe('profile photo', () => {
  it('shows the saved photo straight away, as after a refresh', async () => {
    mocks.auth.profile.avatar_url = PHOTO
    await mountPage()
    expect(wrapper.find('img[alt="Your photo"]').attributes('src')).toBe(PHOTO)
  })

  it('shows the initial when there is no photo', async () => {
    await mountPage()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('M')
  })

  it('uploads a chosen photo, reloads the profile and shows it', async () => {
    await mountPage()
    await choose(new File(['x'], 'me.jpg', { type: 'image/jpeg' }))
    expect(mocks.upload).toHaveBeenCalledWith('u1', expect.any(File), null)
    expect(mocks.loadProfile).toHaveBeenCalledWith('u1')
    expect(wrapper.find('img[alt="Your photo"]').attributes('src')).toBe(PHOTO)
    expect(wrapper.text()).toContain('Photo updated!')
  })

  it('refuses files that are not photos, without uploading', async () => {
    await mountPage()
    await choose(new File(['x'], 'doc.pdf', { type: 'application/pdf' }))
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('JPG, PNG or WebP')
  })

  it('shows the error when the upload fails, and keeps the old photo', async () => {
    mocks.auth.profile.avatar_url = PHOTO
    mocks.upload.mockResolvedValue({ data: null, error: 'new row violates row-level security policy' })
    await mountPage()
    await choose(new File(['x'], 'me.png', { type: 'image/png' }))
    expect(wrapper.text()).toContain('row-level security')
    expect(wrapper.find('img[alt="Your photo"]').attributes('src')).toBe(PHOTO)
    expect(mocks.loadProfile).not.toHaveBeenCalled()
  })

  it('removes the photo', async () => {
    mocks.auth.profile.avatar_url = PHOTO
    mocks.loadProfile.mockImplementation(async () => { mocks.auth.profile.avatar_url = null })
    await mountPage()
    await wrapper.findAll('button').find(b => b.text() === 'Remove photo')!.trigger('click')
    await flushPromises()
    expect(mocks.remove).toHaveBeenCalledWith('u1', PHOTO)
    expect(wrapper.find('img').exists()).toBe(false)
  })
})
