import { supabase } from './supabase'
import type { ApiResponse } from '@/types'
import { resizeAvatar } from '@/utils/image'

const BUCKET = 'avatars'

/** The storage path inside the bucket for a public photo address, or null if it isn't one of ours */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${BUCKET}/`
  const at = url.indexOf(marker)
  if (at === -1) return null
  return decodeURIComponent(url.slice(at + marker.length).split('?')[0]) || null
}

export const avatarService = {
  // Each upload gets its own file name, so a new photo shows straight away (no cached old one)
  // and the address saved on the profile is the single source of truth.
  async upload(userId: string, file: File, previousUrl?: string | null): Promise<ApiResponse<string>> {
    const { blob, ext } = await resizeAvatar(file)
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' })
    if (uploadError) return { data: null, error: uploadError.message }

    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { error: saveError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    if (saveError) {
      await supabase.storage.from(BUCKET).remove([path]) // don't leave an orphan behind
      return { data: null, error: saveError.message }
    }

    await this.discard(previousUrl)
    return { data: url, error: null }
  },

  async remove(userId: string, currentUrl: string | null | undefined): Promise<ApiResponse<null>> {
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    if (error) return { data: null, error: error.message }
    await this.discard(currentUrl)
    return { data: null, error: null }
  },

  // Best effort: a leftover old file is harmless, so failures are ignored
  async discard(url: string | null | undefined) {
    const path = pathFromPublicUrl(url)
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined)
  },
}
