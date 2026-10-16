// Default elements the designer adds, and small helpers for working with a layout's element list.

import type {
  BoxEl, DocElement, DocLayout, ElementType, ImageEl, LineEl, MedicinesEl, TextEl,
} from './types'

export function makeText(id: string, x: number, y: number, w: number, h: number, content: string, over: Partial<TextEl> = {}): TextEl {
  return {
    id, type: 'text', x, y, w, h, content,
    font: 'georgia', size: 11, bold: false, italic: false, underline: false,
    align: 'left', valign: 'top', color: '#1e293b', lineHeight: 1.4, padding: 0,
    ...over,
  }
}

export function makeImage(id: string, x: number, y: number, w: number, h: number, over: Partial<ImageEl> = {}): ImageEl {
  return { id, type: 'image', x, y, w, h, source: { kind: 'clinic_logo' }, fit: 'contain', opacity: 1, radius: 0, ...over }
}

export function makeLine(id: string, x: number, y: number, w: number, over: Partial<LineEl> = {}): LineEl {
  return { id, type: 'line', x, y, w, h: 1.5, thickness: 0.4, color: '#1e293b', dash: 'solid', ...over }
}

export function makeBox(id: string, x: number, y: number, w: number, h: number, over: Partial<BoxEl> = {}): BoxEl {
  return { id, type: 'box', x, y, w, h, ...over }
}

export function makeMedicines(id: string, x: number, y: number, w: number, h: number, over: Partial<MedicinesEl> = {}): MedicinesEl {
  return {
    id, type: 'medicines', x, y, w, h,
    font: 'georgia', size: 12, color: '#1e293b', lineHeight: 1.35, showNumber: true, showQty: true, showSymbol: true,
    ...over,
  }
}

/** The next free id such as "text3", unique within the layout */
export function nextId(layout: DocLayout, prefix: string): string {
  const used = new Set(layout.elements.map(e => e.id))
  let i = 1
  while (used.has(`${prefix}${i}`)) i++
  return `${prefix}${i}`
}

export const ELEMENT_LABELS: Record<ElementType, string> = {
  text: 'Text', image: 'Image', line: 'Line', box: 'Box', medicines: 'Medicines list',
}

export function elementTitle(el: DocElement): string {
  if (el.name) return el.name
  if (el.type === 'text') return el.content.split('\n')[0].slice(0, 28) || 'Text'
  if (el.type === 'image') return el.source.kind === 'clinic_logo' ? 'Clinic logo' : 'Image'
  return ELEMENT_LABELS[el.type]
}

/** A new element of the given type, placed near the top-left of the page's margin */
export function createElement(layout: DocLayout, type: ElementType): DocElement {
  const m = layout.paper.margin + 4
  switch (type) {
    case 'text':
      return makeText(nextId(layout, 'text'), m, m + 6, 80, 12, 'Type your text here\nUse fields like {patient_name}')
    case 'image':
      return makeImage(nextId(layout, 'image'), m, m, 24, 24)
    case 'line':
      return makeLine(nextId(layout, 'line'), m, m + 20, 80)
    case 'box':
      return makeBox(nextId(layout, 'box'), m, m + 20, 60, 24, { border: { width: 0.3, color: '#94a3b8', radius: 1, style: 'solid' } })
    case 'medicines':
      return makeMedicines(nextId(layout, 'meds'), m, m + 40, 100, 70)
  }
}

/** Copies an element a few millimetres down and to the right */
export function duplicateElement(layout: DocLayout, el: DocElement): DocElement {
  const copy = JSON.parse(JSON.stringify(el)) as DocElement
  copy.id = nextId(layout, `${el.type === 'medicines' ? 'meds' : el.type}`)
  copy.x = el.x + 4
  copy.y = el.y + 4
  delete copy.locked
  return copy
}
