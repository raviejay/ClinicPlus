import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn(), updateEq: vi.fn(), update: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl }) },
    from: () => ({ update: mocks.update }),
  },
}))
vi.mock('@/utils/image', () => ({
  resizeAvatar: async (file: File) => ({ blob: file, ext: 'jpg' }),
}))

import { avatarService, pathFromPublicUrl } from './avatar.service'

const BASE = 'https://proj.supabase.co/storage/v1/object/public/avatars/'
const file = new File(['x'], 'me.png', { type: 'image/png' })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.getPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: BASE + path } }))
  mocks.updateEq.mockResolvedValue({ error: null })
  mocks.update.mockReturnValue({ eq: mocks.updateEq })
})

describe('photo address to storage path', () => {
  it('finds the file inside the bucket', () => {
    expect(pathFromPublicUrl(`${BASE}u1/123.jpg`)).toBe('u1/123.jpg')
    expect(pathFromPublicUrl(`${BASE}u1/123.jpg?t=99`)).toBe('u1/123.jpg')
  })
  it('ignores anything that is not one of ours', () => {
    expect(pathFromPublicUrl(null)).toBeNull()
    expect(pathFromPublicUrl('https://elsewhere.com/me.jpg')).toBeNull()
  })
})

describe('uploading a photo', () => {
  it('stores it in the user\'s own folder and saves the address on the profile', async () => {
    const { data, error } = await avatarService.upload('u1', file)
    expect(error).toBeNull()
    const path = mocks.upload.mock.calls[0][0] as string
    expect(path).toMatch(/^u1\/\d+\.jpg$/)
    expect(data).toBe(BASE + path)
    expect(mocks.update).toHaveBeenCalledWith({ avatar_url: BASE + path })
    expect(mocks.updateEq).toHaveBeenCalledWith('id', 'u1')
  })

  it('uses a new file name every time, so the new photo is never served from cache', async () => {
    await avatarService.upload('u1', file)
    await new Promise(r => setTimeout(r, 5))
    await avatarService.upload('u1', file)
    expect(mocks.upload.mock.calls[0][0]).not.toBe(mocks.upload.mock.calls[1][0])
  })

  it('removes the previous photo once the new one is saved', async () => {
    await avatarService.upload('u1', file, `${BASE}u1/old.jpg`)
    expect(mocks.remove).toHaveBeenCalledWith(['u1/old.jpg'])
  })

  it('reports an upload failure and changes nothing', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'Bucket not found' } })
    const { data, error } = await avatarService.upload('u1', file, `${BASE}u1/old.jpg`)
    expect(data).toBeNull()
    expect(error).toBe('Bucket not found')
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled() // the old photo stays
  })

  it('cleans up the new file when the profile could not be updated', async () => {
    mocks.updateEq.mockResolvedValue({ error: { message: 'denied' } })
    const { error } = await avatarService.upload('u1', file, `${BASE}u1/old.jpg`)
    expect(error).toBe('denied')
    const newPath = mocks.upload.mock.calls[0][0]
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledWith([newPath])
  })
})

describe('removing a photo', () => {
  it('clears the profile and deletes the file', async () => {
    const { error } = await avatarService.remove('u1', `${BASE}u1/old.jpg`)
    expect(error).toBeNull()
    expect(mocks.update).toHaveBeenCalledWith({ avatar_url: null })
    expect(mocks.remove).toHaveBeenCalledWith(['u1/old.jpg'])
  })
})
