// Helpers for the Branding & Themes page: color presets, contrast check, request status labels.

export interface ColorPreset {
  name: string
  primary: string
  secondary: string
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Ocean',   primary: '#0ea5e9', secondary: '#0369a1' },
  { name: 'Emerald', primary: '#10b981', secondary: '#047857' },
  { name: 'Teal',    primary: '#14b8a6', secondary: '#0f766e' },
  { name: 'Indigo',  primary: '#6366f1', secondary: '#4338ca' },
  { name: 'Violet',  primary: '#8b5cf6', secondary: '#6d28d9' },
  { name: 'Rose',    primary: '#f43f5e', secondary: '#be123c' },
  { name: 'Amber',   primary: '#f59e0b', secondary: '#b45309' },
  { name: 'Slate',   primary: '#475569', secondary: '#1e293b' },
]

export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')

/** A darker shade of a color, for the second brand color (factor 0.75 = 25% darker) */
export function darken(hex: string, factor = 0.75): string {
  const [r, g, b] = channels(hex)
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colors (1 = identical, 21 = black on white) */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The booking page puts white text on the primary color. Very light colors (yellow,
 * pastels) make that unreadable; the default sky blue (2.8:1) is fine, so warn below 2.2.
 */
export function whiteTextIsHardToRead(primaryHex: string): boolean {
  return isHexColor(primaryHex) && contrastRatio(primaryHex, '#ffffff') < 2.2
}

export type ThemeRequestStatus = 'new' | 'in_progress' | 'done' | 'declined'

export const THEME_REQUEST_STATUS: Record<ThemeRequestStatus, { label: string; classes: string }> = {
  new:         { label: 'Received',    classes: 'bg-sky-100 text-sky-700' },
  in_progress: { label: 'In progress', classes: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Completed',   classes: 'bg-green-100 text-green-700' },
  declined:    { label: 'Declined',    classes: 'bg-slate-100 text-slate-500' },
}

/**
 * Pulls up to 6 distinct, saturated colors out of a logo image (browser only).
 * Samples an 80×80 copy, skips near-white/near-black/transparent/gray pixels and
 * buckets the rest by similarity, most common first. Resolves to [] if the image can't be read.
 */
export async function extractPalette(src: string): Promise<string[]> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image failed to load'))
      img.src = src
    })

    const size = 80
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    const bucket = 40
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      if (a < 128) continue
      const brightness = (r + g + b) / 3
      if (brightness > 240 || brightness < 15) continue
      if (Math.max(r, g, b) - Math.min(r, g, b) < 20) continue
      const key = `${Math.round(r / bucket)},${Math.round(g / bucket)},${Math.round(b / bucket)}`
      const entry = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
      entry.r += r
      entry.g += g
      entry.b += b
      entry.n++
      buckets.set(key, entry)
    }

    return [...buckets.values()]
      .sort((x, y) => y.n - x.n)
      .slice(0, 6)
      .map(v => `#${toHex(v.r / v.n)}${toHex(v.g / v.n)}${toHex(v.b / v.n)}`)
  } catch {
    return [] // the user can still pick colors by hand
  }
}
