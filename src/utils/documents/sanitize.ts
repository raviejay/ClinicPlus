// Layouts come from the database (editable through the API by clinic admins), so nothing in them is
// trusted. sanitizeLayout() rebuilds a layout from scratch: only known fields survive, numbers are
// clamped, colors/fonts/enums come from allow-lists, and image links must be https. The renderer
// only ever sees the output of this function.

import {
  FONT_KEYS, MAX_ELEMENTS, PAPER_SIZES,
  type Align, type Border, type Dash, type DocElement, type DocLayout, type Fit, type FontKey, type ImageSource,
  type PaperSize, type VAlign,
} from './types'

const COLOR = /^#[0-9a-fA-F]{6}$/

export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function safeColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && COLOR.test(v) ? v.toLowerCase() : fallback
}

export function optionalColor(v: unknown): string | undefined {
  return typeof v === 'string' && COLOR.test(v) ? v.toLowerCase() : undefined
}

export function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, v))
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

const ID = /^[A-Za-z0-9_-]{1,40}$/

/** An https link with no characters that could break out of an HTML attribute or a CSS url() */
export function safeImageUrl(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 500 && /^https:\/\/[^\s"'<>()\\]+$/.test(v) ? v : null
}

function sanitizeBorder(v: unknown): Border | undefined {
  if (!isObject(v)) return undefined
  const width = clampNumber(v.width, 0, 5, 0)
  if (width <= 0) return undefined
  return {
    width,
    color: safeColor(v.color, '#94a3b8'),
    radius: clampNumber(v.radius, 0, 50, 0),
    style: oneOf<Dash>(v.style, ['solid', 'dashed', 'dotted'], 'solid'),
  }
}

function sanitizeSource(v: unknown): ImageSource {
  if (isObject(v) && v.kind === 'url') {
    const url = safeImageUrl(v.url)
    if (url) return { kind: 'url', url }
  }
  return { kind: 'clinic_logo' }
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

function sanitizeElement(raw: unknown, fallbackId: string): DocElement | null {
  if (!isObject(raw)) return null
  const base = {
    id: typeof raw.id === 'string' && ID.test(raw.id) ? raw.id : fallbackId,
    x: clampNumber(raw.x, -100, 1000, 0),
    y: clampNumber(raw.y, -100, 1000, 0),
    w: clampNumber(raw.w, 0, 1000, 20),
    h: clampNumber(raw.h, 0, 1000, 10),
    ...(raw.locked === true ? { locked: true } : {}),
    ...(typeof raw.name === 'string' && raw.name.trim() ? { name: raw.name.trim().slice(0, 60) } : {}),
  }

  switch (raw.type) {
    case 'text': {
      const fill = optionalColor(raw.fill)
      const border = sanitizeBorder(raw.border)
      return {
        ...base, type: 'text',
        content: text(raw.content, 5000),
        font: oneOf<FontKey>(raw.font, FONT_KEYS, 'georgia'),
        size: clampNumber(raw.size, 5, 72, 11),
        bold: raw.bold === true,
        italic: raw.italic === true,
        underline: raw.underline === true,
        align: oneOf<Align>(raw.align, ['left', 'center', 'right', 'justify'], 'left'),
        valign: oneOf<VAlign>(raw.valign, ['top', 'middle', 'bottom'], 'top'),
        color: safeColor(raw.color, '#1e293b'),
        lineHeight: clampNumber(raw.lineHeight, 0.8, 3, 1.4),
        padding: clampNumber(raw.padding, 0, 30, 0),
        ...(fill ? { fill } : {}),
        ...(border ? { border } : {}),
      }
    }
    case 'image':
      return {
        ...base, type: 'image',
        source: sanitizeSource(raw.source),
        fit: oneOf<Fit>(raw.fit, ['contain', 'cover', 'fill'], 'contain'),
        opacity: clampNumber(raw.opacity, 0.05, 1, 1),
        radius: clampNumber(raw.radius, 0, 50, 0),
      }
    case 'line':
      return {
        ...base, type: 'line',
        thickness: clampNumber(raw.thickness, 0.1, 5, 0.4),
        color: safeColor(raw.color, '#1e293b'),
        dash: oneOf<Dash>(raw.dash, ['solid', 'dashed', 'dotted'], 'solid'),
      }
    case 'box': {
      const fill = optionalColor(raw.fill)
      const border = sanitizeBorder(raw.border)
      return { ...base, type: 'box', ...(fill ? { fill } : {}), ...(border ? { border } : {}) }
    }
    case 'medicines':
      return {
        ...base, type: 'medicines',
        font: oneOf<FontKey>(raw.font, FONT_KEYS, 'georgia'),
        size: clampNumber(raw.size, 5, 40, 12),
        color: safeColor(raw.color, '#1e293b'),
        lineHeight: clampNumber(raw.lineHeight, 0.8, 3, 1.35),
        showNumber: raw.showNumber !== false,
        showQty: raw.showQty !== false,
        showSymbol: raw.showSymbol !== false,
      }
    default:
      return null
  }
}

export function emptyLayout(size: PaperSize = 'a4'): DocLayout {
  return { version: 1, paper: { size, orientation: 'portrait', margin: 8 }, elements: [] }
}

/** Rebuilds any input into a valid, safe layout. Never throws. */
export function sanitizeLayout(input: unknown): DocLayout {
  if (!isObject(input)) return emptyLayout()
  const paper = isObject(input.paper) ? input.paper : {}
  const elements: DocElement[] = []
  const seen = new Set<string>()

  const list = Array.isArray(input.elements) ? input.elements.slice(0, MAX_ELEMENTS) : []
  list.forEach((raw, i) => {
    const el = sanitizeElement(raw, `el${i + 1}`)
    if (!el) return
    let id = el.id
    for (let n = 2; seen.has(id); n++) id = `${el.id}-${n}`
    seen.add(id)
    elements.push({ ...el, id })
  })

  return {
    version: 1,
    paper: {
      size: oneOf<PaperSize>(paper.size, Object.keys(PAPER_SIZES) as PaperSize[], 'a4'),
      orientation: paper.orientation === 'landscape' ? 'landscape' : 'portrait',
      margin: clampNumber(paper.margin, 0, 40, 8),
    },
    elements,
  }
}
