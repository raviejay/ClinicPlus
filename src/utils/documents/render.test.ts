import { describe, expect, it } from 'vitest'
import { buildPrintHtml, escapeHtml, renderPageHtml } from './render'
import { sanitizeLayout } from './sanitize'
import { fillPlaceholders } from './placeholders'
import { makeBox, makeImage, makeLine, makeMedicines, makeText } from './elements'
import type { DocData, DocLayout } from './types'

const layoutOf = (...elements: any[]): DocLayout => ({ version: 1, paper: { size: 'a4', orientation: 'portrait', margin: 8 }, elements })
const data = (values: Record<string, string> = {}, medicines: DocData['medicines'] = []): DocData => ({ values, medicines })

const EVIL = `<img src=x onerror="alert(1)"><script>alert(2)</script>"'`

describe('escaping', () => {
  it('escapes the five HTML characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
    expect(escapeHtml(null)).toBe('')
  })
})

describe('typed text can never become markup', () => {
  const html = renderPageHtml(
    layoutOf(
      makeText('t', 10, 10, 100, 20, 'Patient: {patient_name}\nStatic: ' + EVIL),
      makeMedicines('m', 10, 40, 100, 50),
    ),
    data({ patient_name: EVIL }, [{ name: EVIL, sig: EVIL, qty: EVIL }]),
  )

  it('contains no script or event-handler elements', () => {
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<[^>]*\sonerror\s*=/i)
  })
  it('shows the characters as text instead', () => {
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })
  it('works the same through the print page', () => {
    const doc = buildPrintHtml(layoutOf(makeText('t', 1, 1, 50, 10, '{patient_name}')), data({ patient_name: EVIL }), { title: EVIL })
    expect(doc).not.toMatch(/<script/i)
    expect(doc).toContain('<title>&lt;img')
  })
})

describe('a hostile layout cannot inject CSS or markup', () => {
  const attack = {
    version: 1,
    paper: { size: 'a4; x', orientation: 'portrait', margin: 'huge' },
    elements: [
      { id: 'a"><script>alert(1)</script>', type: 'text', x: '10;display:none', y: 1e9, w: 50, h: 10, content: 'hi', color: 'red;background:url(javascript:alert(1))', font: 'x;position:fixed', align: 'left;x', fill: 'expression(alert(1))', border: { width: 1, color: 'blue}body{display:none', radius: 1 } },
      { id: 'img1', type: 'image', x: 0, y: 0, w: 10, h: 10, source: { kind: 'url', url: 'javascript:alert(1)' } },
      { id: 'img2', type: 'image', x: 0, y: 0, w: 10, h: 10, source: { kind: 'url', url: 'https://x.test/a.png" onerror="alert(1)' } },
      { id: 'img3', type: 'image', x: 0, y: 0, w: 10, h: 10, source: { kind: 'url', url: 'https://x.test/a.png)' } },
      { id: 'img4', type: 'image', x: 0, y: 0, w: 10, h: 10, source: { kind: 'url', url: 'data:image/png;base64,AAAA' } },
      { id: 'bad', type: 'iframe', x: 0, y: 0, w: 1, h: 1 },
      'not an object',
    ],
  }
  const safe = sanitizeLayout(attack)
  const html = renderPageHtml(attack as any, data(), {})

  it('keeps only the elements it understands', () => {
    expect(safe.elements.map(e => e.type)).toEqual(['text', 'image', 'image', 'image', 'image'])
  })
  it('replaces unsafe ids, numbers, colors, fonts and enums with safe defaults', () => {
    const text = safe.elements[0] as any
    expect(text.id).toBe('el1')
    expect(text.x).toBe(0)
    expect(text.y).toBe(1000)
    expect(text.color).toBe('#1e293b')
    expect(text.font).toBe('georgia')
    expect(text.align).toBe('left')
    expect(text.fill).toBeUndefined()
    expect(text.border).toMatchObject({ color: '#94a3b8' })
    expect(safe.paper).toEqual({ size: 'a4', orientation: 'portrait', margin: 8 })
  })
  it('drops every non-https or attribute-breaking image link', () => {
    for (const el of safe.elements.slice(1)) expect((el as any).source).toEqual({ kind: 'clinic_logo' })
  })
  it('produces no script, handler or url() from the attack', () => {
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/onerror/i)
    expect(html).not.toMatch(/url\(/i)
    expect(html).not.toMatch(/expression\(/i)
    expect(html).not.toMatch(/position:fixed/i)
    expect(html).not.toContain('display:none')
  })
})

describe('image links', () => {
  it('draws an https image', () => {
    const html = renderPageHtml(layoutOf(makeImage('i', 0, 0, 20, 20, { source: { kind: 'url', url: 'https://cdn.test/sig.png' } })), data())
    expect(html).toContain('src="https://cdn.test/sig.png"')
  })
  it('uses the clinic logo only when it is an https link', () => {
    const l = layoutOf(makeImage('i', 0, 0, 20, 20))
    expect(renderPageHtml(l, data(), { clinicLogoUrl: 'https://cdn.test/logo.png' })).toContain('src="https://cdn.test/logo.png"')
    expect(renderPageHtml(l, data(), { clinicLogoUrl: 'javascript:alert(1)' })).not.toContain('<img')
    expect(renderPageHtml(l, data(), { clinicLogoUrl: null })).toContain('data-empty="true"')
  })
})

describe('placeholders', () => {
  const values = { patient_name: 'Juan', diagnosis: '', remarks_block: '', date: 'October 12, 2026' }

  it('fills known fields and keeps unknown ones as typed so a typo is visible', () => {
    expect(fillPlaceholders('Hi {patient_name} on {date} {nope}', values)).toBe('Hi Juan on October 12, 2026 {nope}')
  })
  it('drops a line whose fields are all empty', () => {
    expect(fillPlaceholders('A\n{remarks_block}\nB', values)).toBe('A\nB')
    expect(fillPlaceholders('Notes: {diagnosis}\nB', values)).toBe('Notes: \nB') // has static text, so it stays
  })
  it('keeps a line with a mix of empty and filled fields', () => {
    expect(fillPlaceholders('{patient_name} {diagnosis}', values)).toBe('Juan ')
  })
  it('does not leave a double gap where an optional paragraph was', () => {
    expect(fillPlaceholders('A\n\n{remarks_block}\n\nB', values)).toBe('A\n\nB')
  })
  it('does not treat a value that contains braces as another field', () => {
    expect(fillPlaceholders('{patient_name}', { patient_name: '{date}', date: 'X' })).toBe('{date}')
  })
  it('renders empty optional lines out of the page', () => {
    const html = renderPageHtml(layoutOf(makeText('t', 0, 0, 100, 30, 'A\n{remarks_block}\nB')), data({ remarks_block: '' }))
    expect(html).toContain('>A\nB<')
  })
})

describe('medicines list', () => {
  const l = layoutOf(makeMedicines('m', 10, 10, 100, 60))
  const meds = [{ name: 'Amoxicillin 500mg', sig: '1 cap TID', qty: '#21' }, { name: '   ', sig: 'ignored', qty: '' }, { name: 'Paracetamol', sig: '', qty: '' }]

  it('numbers the medicines, skips blank ones, and shows sig and quantity', () => {
    const html = renderPageHtml(l, data({}, meds))
    expect(html).toContain('>1.<')
    expect(html).toContain('>2.<')
    expect(html).not.toContain('>3.<')
    expect(html).toContain('Amoxicillin 500mg')
    expect(html).toContain('1 cap TID')
    expect(html).toContain('#21')
    expect(html).not.toContain('ignored')
    expect(html).toContain('&#8478;') // the Rx symbol
  })
  it('draws nothing, not even the symbol, when there are no medicines', () => {
    const html = renderPageHtml(l, data())
    expect(html).not.toContain('&#8478;')
    expect(html).not.toContain('>1.<')
  })
  it('can hide numbers, quantities and the symbol', () => {
    const quiet = layoutOf(makeMedicines('m', 10, 10, 100, 60, { showNumber: false, showQty: false, showSymbol: false }))
    const html = renderPageHtml(quiet, data({}, meds))
    expect(html).not.toContain('>1.<')
    expect(html).not.toContain('#21')
    expect(html).not.toContain('&#8478;')
  })
})

describe('print page', () => {
  it('sets the page to the exact paper size with no margins', () => {
    const doc = buildPrintHtml(layoutOf(makeBox('b', 0, 0, 10, 10)), data())
    expect(doc).toContain('@page { size: 210mm 297mm; margin: 0; }')
    expect(doc).toContain('width:210mm;height:297mm')
  })
  it('swaps width and height for landscape', () => {
    const l: DocLayout = { ...layoutOf(), paper: { size: 'a5', orientation: 'landscape', margin: 8 } }
    expect(buildPrintHtml(l, data())).toContain('size: 210mm 148mm')
  })
  it('knows letter, half letter and legal', () => {
    const size = (s: DocLayout['paper']['size']) => buildPrintHtml({ ...layoutOf(), paper: { size: s, orientation: 'portrait', margin: 8 } }, data())
    expect(size('letter')).toContain('215.9mm 279.4mm')
    expect(size('half_letter')).toContain('139.7mm 215.9mm')
    expect(size('legal')).toContain('215.9mm 355.6mm')
  })
  it('keeps colors when printing', () => {
    expect(buildPrintHtml(layoutOf(), data())).toContain('print-color-adjust: exact')
  })
})

describe('rendering shapes', () => {
  it('positions elements in millimetres', () => {
    const html = renderPageHtml(layoutOf(makeText('t', 12.5, 30, 80, 10, 'x')), data())
    expect(html).toContain('left:12.5mm;top:30mm;width:80mm;height:10mm')
  })
  it('draws lines and boxes', () => {
    const html = renderPageHtml(layoutOf(makeLine('l', 10, 10, 100, { thickness: 0.6, color: '#0ea5e9', dash: 'dashed' }), makeBox('b', 5, 5, 20, 20, { fill: '#f8fafc' })), data())
    expect(html).toContain('border-top:0.6mm dashed #0ea5e9')
    expect(html).toContain('background:#f8fafc')
  })
  it('applies text styling', () => {
    const html = renderPageHtml(layoutOf(makeText('t', 0, 0, 50, 10, 'x', { bold: true, italic: true, underline: true, size: 14, align: 'center', font: 'arial', color: '#ff0000' })), data())
    expect(html).toContain('font-weight:700')
    expect(html).toContain('font-style:italic')
    expect(html).toContain('text-decoration:underline')
    expect(html).toContain('font-size:14pt')
    expect(html).toContain('text-align:center')
    expect(html).toContain('Arial, Helvetica, sans-serif')
    expect(html).toContain('color:#ff0000')
  })
})
