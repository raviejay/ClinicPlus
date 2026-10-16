/** Largest side of a stored profile photo, in pixels: plenty for an avatar, tiny to store */
export const AVATAR_SIZE = 384
export const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** A message when the file cannot be used as a photo, otherwise null */
export function avatarFileProblem(file: { type: string; size: number }): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Please choose a JPG, PNG or WebP image.'
  if (file.size > MAX_AVATAR_FILE_BYTES) return 'That image is too large. Choose one under 8 MB.'
  return null
}

/** The square (top-left corner and side) to cut from the middle of a width x height picture */
export function centerSquare(width: number, height: number) {
  const side = Math.min(width, height)
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side }
}

/**
 * Crops to a centred square and shrinks to AVATAR_SIZE as a JPEG. Falls back to the original file
 * when the browser cannot do it, so choosing a photo never fails just because of resizing.
 */
export async function resizeAvatar(file: File): Promise<{ blob: Blob; ext: string }> {
  const original = { blob: file as Blob, ext: file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg' }
  try {
    if (typeof createImageBitmap !== 'function') return original
    const bitmap = await createImageBitmap(file)
    const { sx, sy, side } = centerSquare(bitmap.width, bitmap.height)
    const size = Math.min(AVATAR_SIZE, side)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return original
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    return blob ? { blob, ext: 'jpg' } : original
  } catch {
    return original
  }
}
