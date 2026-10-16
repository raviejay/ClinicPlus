// Turns a layout + the document's details into HTML for the preview, the editor canvas and printing.
// The layout is sanitized first and every piece of text is escaped, so a layout or a patient name
// can never inject markup or CSS.

import { fillPlaceholders } from './placeholders'
import { sanitizeLayout, safeImageUrl } from './sanitize'
import {
  FONTS, paperDimensions,
  type Border, type DocData, type DocElement, type DocLayout, type ImageEl, type MedicinesEl, type TextEl,
} from './types'

export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const n = (v: number) => String(Math.round(v * 1000) / 1000)

export interface RenderOptions {
  /** The clinic's logo (from Branding), used by "Clinic logo" image elements */
  clinicLogoUrl?: string | null
}

function position(el: DocElement): string {
  return `position:absolute;box-sizing:border-box;left:${n(el.x)}mm;top:${n(el.y)}mm;width:${n(el.w)}mm;height:${n(el.h)}mm;`
}

function borderCss(b: Border | undefined): string {
  return b ? `border:${n(b.width)}mm ${b.style} ${b.color};border-radius:${n(b.radius)}mm;` : ''
}

const attrs = (el: DocElement) => `data-el="${escapeHtml(el.id)}" data-type="${el.type}"`

function renderText(el: TextEl, data: DocData): string {
  const justify = el.valign === 'top' ? 'flex-start' : el.valign === 'middle' ? 'center' : 'flex-end'
  const style =
    position(el) +
    `display:flex;flex-direction:column;justify-content:${justify};` +
    `font-family:${FONTS[el.font].css};font-size:${n(el.size)}pt;line-height:${n(el.lineHeight)};color:${el.color};` +
    `font-weight:${el.bold ? 700 : 400};font-style:${el.italic ? 'italic' : 'normal'};` +
    `text-decoration:${el.underline ? 'underline' : 'none'};text-align:${el.align};padding:${n(el.padding)}mm;` +
    (el.fill ? `background:${el.fill};` : '') + borderCss(el.border)
  const body = escapeHtml(fillPlaceholders(el.content, data.values))
  return `<div ${attrs(el)} style="${style}"><div style="white-space:pre-wrap;overflow-wrap:anywhere;">${body}</div></div>`
}

function renderImage(el: ImageEl, opts: RenderOptions): string {
  const url = el.source.kind === 'url' ? safeImageUrl(el.source.url) : safeImageUrl(opts.clinicLogoUrl ?? null)
  const style = position(el) + `opacity:${n(el.opacity)};border-radius:${n(el.radius)}mm;overflow:hidden;`
  const img = url
    ? `<img src="${escapeHtml(url)}" alt="" style="display:block;width:100%;height:100%;object-fit:${el.fit};">`
    : ''
  return `<div ${attrs(el)} data-empty="${url ? 'false' : 'true'}" style="${style}">${img}</div>`
}

function renderLine(el: DocElement & { type: 'line' }): string {
  const style = position(el) + 'display:flex;align-items:center;'
  const line = `width:100%;border-top:${n(el.thickness)}mm ${el.dash} ${el.color};`
  return `<div ${attrs(el)} style="${style}"><div style="${line}"></div></div>`
}

function renderBox(el: DocElement & { type: 'box' }): string {
  const style = position(el) + (el.fill ? `background:${el.fill};` : '') + borderCss(el.border)
  return `<div ${attrs(el)} style="${style}"></div>`
}

function renderMedicines(el: MedicinesEl, data: DocData): string {
  const meds = data.medicines.filter(m => m.name.trim())
  const style =
    position(el) +
    `font-family:${FONTS[el.font].css};font-size:${n(el.size)}pt;line-height:${n(el.lineHeight)};color:${el.color};`
  const symbol = el.showSymbol && meds.length
    ? `<div style="font-size:2em;font-weight:700;line-height:1;margin-bottom:1.5mm;">&#8478;</div>` : ''
  const rows = meds.map((m, i) => `
    <div style="display:flex;gap:2mm;margin-bottom:2.2mm;">
      ${el.showNumber ? `<div style="flex:none;min-width:5.5mm;font-weight:700;">${i + 1}.</div>` : ''}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;overflow-wrap:anywhere;">${escapeHtml(m.name)}</div>
        ${m.sig.trim() ? `<div style="font-size:0.85em;overflow-wrap:anywhere;opacity:0.85;">${escapeHtml(m.sig)}</div>` : ''}
      </div>
      ${el.showQty && m.qty.trim() ? `<div style="flex:none;font-weight:700;">${escapeHtml(m.qty)}</div>` : ''}
    </div>`).join('')
  return `<div ${attrs(el)} style="${style}">${symbol}${rows}</div>`
}

export function renderElementHtml(el: DocElement, data: DocData, opts: RenderOptions = {}): string {
  switch (el.type) {
    case 'text': return renderText(el, data)
    case 'image': return renderImage(el, opts)
    case 'line': return renderLine(el)
    case 'box': return renderBox(el)
    case 'medicines': return renderMedicines(el, data)
  }
}

/** One page, sized in millimetres. The layout is sanitized first. */
export function renderPageHtml(layout: DocLayout, data: DocData, opts: RenderOptions = {}): string {
  const safe = sanitizeLayout(layout)
  const { w, h } = paperDimensions(safe.paper)
  const body = safe.elements.map(el => renderElementHtml(el, data, opts)).join('')
  return `<div class="doc-page" style="position:relative;width:${n(w)}mm;height:${n(h)}mm;background:#fff;overflow:hidden;">${body}</div>`
}

/** A complete page that prints at exactly the paper size, with no browser margins */
export function buildPrintHtml(layout: DocLayout, data: DocData, opts: RenderOptions & { title?: string } = {}): string {
  const safe = sanitizeLayout(layout)
  const { w, h } = paperDimensions(safe.paper)
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(opts.title ?? 'Document')}</title>
<style>
  @page { size: ${n(w)}mm ${n(h)}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body>${renderPageHtml(safe, data, opts)}</body></html>`
}

/**
 * Ids of elements whose text runs past the box it was given (it would overprint what is below).
 * Browser only: needs real layout, so it reports nothing where there is none (tests).
 */
export function findOverflowingElements(container: HTMLElement): string[] {
  const found: string[] = []
  container.querySelectorAll<HTMLElement>('[data-el][data-type="text"], [data-el][data-type="medicines"]').forEach(node => {
    if (node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 2) found.push(node.dataset.el ?? '')
  })
  return found
}
