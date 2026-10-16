import { describe, expect, it } from 'vitest'
import {
  PLACEHOLDERS, ageFrom, buildValues, doctorDisplayName, longDate, placeholderKeys, placeholdersIn, sampleValues,
  shortDate, unknownPlaceholders, type ValueContext,
} from './placeholders'
import { PRESET_STYLES, presetLayout } from './presets'
import { sanitizeLayout } from './sanitize'
import { renderPageHtml } from './render'
import { createElement, duplicateElement, elementTitle, nextId } from './elements'
import {
  alignRect, clampOnPage, moveRect, nudgeRect, resizeRect, snap, snapToGuides, type Rect,
} from './geometry'
import { createHistory } from './history'
import { PAPER_SIZES, paperDimensions, type DocKind, type PaperSize } from './types'

const ctx: ValueContext = {
  clinicName: 'Sunrise Clinic', clinicEmail: 'hi@sunrise.ph', branch: null,
  patient: { full_name: 'Juan Dela Cruz', birthdate: '1992-03-04', gender: 'male', address: '45 Mabini St', contact_number: '0917' },
  doctorName: 'Maria Reyes', today: '2026-10-12',
}

describe('dates and ages', () => {
  it('formats dates', () => {
    expect(longDate('2026-10-12')).toBe('October 12, 2026')
    expect(shortDate('2026-10-12')).toBe('10/12/2026')
    expect(longDate('nonsense')).toBe('')
  })
  it('works out age, including when the birthday has not happened yet this year', () => {
    expect(ageFrom('1992-03-04', '2026-10-12')).toBe('34 y/o')
    expect(ageFrom('1992-12-25', '2026-10-12')).toBe('33 y/o')
    expect(ageFrom('1992-10-12', '2026-10-12')).toBe('34 y/o') // birthday today
    expect(ageFrom(null, '2026-10-12')).toBe('')
    expect(ageFrom('2030-01-01', '2026-10-12')).toBe('')
  })
  it('adds "Dr." to a doctor name once', () => {
    expect(doctorDisplayName('Maria Reyes')).toBe('Dr. Maria Reyes')
    expect(doctorDisplayName('Dr. Maria Reyes')).toBe('Dr. Maria Reyes')
    expect(doctorDisplayName('dr maria')).toBe('dr maria')
    expect(doctorDisplayName(null)).toBe('')
  })
})

describe('values for a medical certificate', () => {
  const form = { date: '2026-10-12', purpose: 'employment', diagnosis: ' Flu ', remarks: 'Rest', restDays: 3, validUntil: '2026-10-19' }
  const v = buildValues('medcert', ctx, form)

  it('fills the patient, doctor and dates', () => {
    expect(v.patient_name).toBe('Juan Dela Cruz')
    expect(v.patient_age_sex).toBe('34 y/o, Male')
    expect(v.patient_age_sex_paren).toBe(' (34 y/o, Male)')
    expect(v.doctor_name).toBe('Dr. Maria Reyes')
    expect(v.date).toBe('October 12, 2026')
    expect(v.clinic_name).toBe('Sunrise Clinic')
  })
  it('builds the optional sentences and headed blocks', () => {
    expect(v.purpose_suffix).toBe(' (Employment / Work)')
    expect(v.diagnosis_block).toBe('Findings / Diagnosis:\nFlu')
    expect(v.remarks_block).toBe('Recommendation:\nRest')
    expect(v.rest_days_sentence).toBe('The patient is advised to rest for 3 day(s).')
    expect(v.valid_until_line).toBe('Valid until: October 19, 2026')
  })
  it('leaves optional ones empty when blank', () => {
    const empty = buildValues('medcert', { ...ctx, patient: { full_name: 'X' } }, { date: '2026-10-12', purpose: '', diagnosis: '', remarks: '', restDays: '', validUntil: '' })
    for (const k of ['purpose_suffix', 'diagnosis_block', 'remarks_block', 'rest_days_sentence', 'valid_until_line', 'patient_age_sex_paren', 'patient_age_sex']) {
      expect(empty[k], k).toBe('')
    }
  })
  it('ignores zero or negative rest days', () => {
    expect(buildValues('medcert', ctx, { ...form, restDays: 0 }).rest_days_sentence).toBe('')
    expect(buildValues('medcert', ctx, { ...form, restDays: -2 }).rest_days_sentence).toBe('')
  })
})

describe('values for a prescription', () => {
  const v = buildValues('prescription', ctx, { date: '2026-10-12', diagnosis: 'URTI', remarks: 'After meals', followUp: '2026-10-19' })
  it('has labelled lines that disappear when empty', () => {
    expect(v.diagnosis_line).toBe('Dx: URTI')
    expect(v.remarks_block).toBe('Notes: After meals')
    expect(v.follow_up_line).toBe('Follow-up: October 19, 2026')
    const empty = buildValues('prescription', ctx, { date: '2026-10-12', diagnosis: '', remarks: '', followUp: '' })
    expect(empty.diagnosis_line + empty.remarks_block + empty.follow_up_line).toBe('')
  })
})

describe('placeholder registry', () => {
  it('has a sample for every field of each kind', () => {
    for (const kind of ['medcert', 'prescription'] as DocKind[]) {
      const s = sampleValues(kind)
      for (const key of placeholderKeys(kind)) expect(s[key], key).toBeTruthy()
    }
  })
  it('keys are lowercase words so they match the {field} syntax', () => {
    for (const p of PLACEHOLDERS) expect(p.key).toMatch(/^[a-z_]+$/)
  })
  it('finds and flags placeholders', () => {
    expect(placeholdersIn('{a} and {b} and {a}')).toEqual(['a', 'b'])
    expect(unknownPlaceholders('{patient_name} {oops}', 'medcert')).toEqual(['oops'])
    expect(unknownPlaceholders('{diagnosis_line}', 'medcert')).toEqual(['diagnosis_line']) // prescription-only field
    expect(unknownPlaceholders('{diagnosis_line}', 'prescription')).toEqual([])
  })
})

describe('preset templates', () => {
  const kinds: DocKind[] = ['medcert', 'prescription']
  const papers = Object.keys(PAPER_SIZES) as PaperSize[]

  for (const kind of kinds) {
    for (const { key: style } of PRESET_STYLES) {
      describe(`${kind} / ${style}`, () => {
        const layout = presetLayout(kind, style, { accent: '#10b981' })

        it('is already a valid, safe layout (sanitizing changes nothing)', () => {
          expect(sanitizeLayout(layout)).toEqual(layout)
        })
        it('only uses fields that exist for this kind', () => {
          const known = placeholderKeys(kind)
          for (const el of layout.elements) {
            if (el.type !== 'text') continue
            for (const key of placeholdersIn(el.content)) expect(known.has(key), `${el.id}: {${key}}`).toBe(true)
          }
        })
        it('has the parts a clinic document needs', () => {
          const text = layout.elements.filter(e => e.type === 'text').map(e => (e as any).content).join('\n')
          expect(text).toContain('{doctor_name}')
          expect(text).toContain('{patient_name}')
          expect(text).toContain('{document_number}')
          expect(layout.elements.some(e => e.type === 'line')).toBe(true) // signature line
          expect(layout.elements.some(e => e.type === 'medicines')).toBe(kind === 'prescription')
        })
        it('renders with sample values and shows the patient', () => {
          const html = renderPageHtml(layout, { values: sampleValues(kind), medicines: [{ name: 'Amoxicillin', sig: '1 cap TID', qty: '#21' }] })
          expect(html).toContain('Juan Dela Cruz')
        })
      })
    }
  }

  it('keeps every element on the page at every paper size', () => {
    for (const kind of kinds) for (const style of PRESET_STYLES) for (const paper of papers) {
      const layout = presetLayout(kind, style.key, { paper })
      const { w, h } = paperDimensions(layout.paper)
      for (const el of layout.elements) {
        // Rx presets are drawn for A5/half-letter; larger paper still keeps content within the page
        expect(el.x, `${kind}/${style.key}/${paper}/${el.id} left`).toBeGreaterThanOrEqual(0)
        expect(el.y, `${kind}/${style.key}/${paper}/${el.id} top`).toBeGreaterThanOrEqual(0)
        expect(el.x + el.w, `${kind}/${style.key}/${paper}/${el.id} right`).toBeLessThanOrEqual(w + 0.01)
        expect(el.y + el.h, `${kind}/${style.key}/${paper}/${el.id} bottom`).toBeLessThanOrEqual(h + 0.01)
      }
    }
  })
  it('the plain preset has no header, for pre-printed paper', () => {
    const plain = presetLayout('medcert', 'minimal')
    expect(plain.elements.find(e => e.id === 'logo')).toBeUndefined()
    expect(plain.elements.find(e => e.id === 'clinic')).toBeUndefined()
  })
  it('uses the accent color on the classic rule and the modern band', () => {
    expect((presetLayout('medcert', 'classic', { accent: '#ff0000' }).elements.find(e => e.id === 'rule') as any).color).toBe('#ff0000')
    expect((presetLayout('medcert', 'modern', { accent: '#ff0000' }).elements.find(e => e.id === 'band') as any).fill).toBe('#ff0000')
  })
})

describe('element helpers', () => {
  const layout = presetLayout('medcert', 'classic')
  it('picks unused ids', () => {
    expect(nextId(layout, 'text')).toBe('text1')
    const withText = { ...layout, elements: [...layout.elements, createElement(layout, 'text')] }
    expect(nextId(withText, 'text')).toBe('text2')
  })
  it('creates every element type inside the page', () => {
    for (const type of ['text', 'image', 'line', 'box', 'medicines'] as const) {
      const el = createElement(layout, type)
      expect(el.type).toBe(type)
      expect(sanitizeLayout({ ...layout, elements: [el] }).elements).toHaveLength(1)
    }
  })
  it('duplicates with an offset, a new id, and unlocked', () => {
    const original = { ...(layout.elements[0] as any), locked: true }
    const copy = duplicateElement(layout, original)
    expect(copy.id).not.toBe(original.id)
    expect(copy.x).toBe(original.x + 4)
    expect(copy.locked).toBeUndefined()
  })
  it('titles elements for the layers list', () => {
    expect(elementTitle({ ...(layout.elements[0] as any), name: 'Mine' })).toBe('Mine')
    expect(elementTitle(createElement(layout, 'medicines'))).toBe('Medicines list')
  })
})

describe('geometry', () => {
  const page = { w: 210, h: 297 }
  const r: Rect = { x: 20, y: 30, w: 50, h: 20 }

  it('snaps to a grid', () => {
    expect(snap(12.4, 5)).toBe(10)
    expect(snap(12.6, 5)).toBe(15)
    expect(snap(12.4, 0)).toBe(12.4)
  })
  it('moves, snapping to the grid', () => {
    expect(moveRect(r, 7.2, 3, { grid: 5, page })).toEqual({ x: 25, y: 35, w: 50, h: 20 })
  })
  it('keeps part of an element on the page', () => {
    expect(moveRect(r, 1000, 1000, { page }).x).toBe(206)
    expect(moveRect(r, -1000, -1000, { page }).x).toBe(-46)
    expect(clampOnPage({ x: 500, y: -500, w: 10, h: 10 }, page)).toMatchObject({ x: 206, y: -6 })
  })
  describe('resizing', () => {
    it('drags the east and south edges', () => {
      expect(resizeRect(r, 'se', 10, 5)).toEqual({ x: 20, y: 30, w: 60, h: 25 })
    })
    it('drags the west and north edges, keeping the opposite side fixed', () => {
      expect(resizeRect(r, 'nw', 10, 5)).toEqual({ x: 30, y: 35, w: 40, h: 15 })
    })
    it('changes only one dimension from a side handle', () => {
      expect(resizeRect(r, 'e', 10, 99)).toEqual({ x: 20, y: 30, w: 60, h: 20 })
      expect(resizeRect(r, 'n', 99, -10)).toEqual({ x: 20, y: 20, w: 50, h: 30 })
    })
    it('never shrinks below the minimum, whichever edge is dragged', () => {
      expect(resizeRect(r, 'e', -500, 0)).toMatchObject({ x: 20, w: 2 })
      expect(resizeRect(r, 'w', 500, 0)).toMatchObject({ x: 68, w: 2 })
      expect(resizeRect(r, 's', 0, -500)).toMatchObject({ y: 30, h: 2 })
      expect(resizeRect(r, 'n', 0, 500)).toMatchObject({ y: 48, h: 2 })
    })
    it('snaps the dragged edge to the grid', () => {
      expect(resizeRect(r, 'e', 7, 0, { grid: 5 }).w).toBe(55)
    })
  })
  it('aligns to the page and its margin', () => {
    expect(alignRect(r, page, 'left', 8).x).toBe(8)
    expect(alignRect(r, page, 'right', 8).x).toBe(152)
    expect(alignRect(r, page, 'center').x).toBe(80)
    expect(alignRect(r, page, 'top', 8).y).toBe(8)
    expect(alignRect(r, page, 'bottom', 8).y).toBe(269)
    expect(alignRect(r, page, 'middle').y).toBe(138.5)
  })
  describe('snapping to guides', () => {
    it('snaps an edge to another element and reports the guide', () => {
      const other: Rect = { x: 100, y: 100, w: 40, h: 10 }
      const { rect, guides } = snapToGuides({ x: 99.5, y: 10, w: 20, h: 10 }, [other], page, 8)
      expect(rect.x).toBe(100)
      expect(guides).toContainEqual({ axis: 'x', at: 100 })
    })
    it('snaps the centre to the page centre', () => {
      const { rect } = snapToGuides({ x: 84.4, y: 50, w: 40, h: 10 }, [], page, 8)
      expect(rect.x).toBe(85)
    })
    it('leaves it alone when nothing is close', () => {
      const { rect, guides } = snapToGuides({ x: 33, y: 44, w: 20, h: 10 }, [{ x: 150, y: 200, w: 10, h: 10 }], page, 8)
      expect(rect).toEqual({ x: 33, y: 44, w: 20, h: 10 })
      expect(guides).toEqual([])
    })
  })
  it('nudges 1 mm, or 5 mm with shift, staying on the page', () => {
    expect(nudgeRect(r, 'ArrowRight', false, page).x).toBe(21)
    expect(nudgeRect(r, 'ArrowUp', true, page).y).toBe(25)
    expect(nudgeRect({ x: 205, y: 0, w: 50, h: 10 }, 'ArrowRight', true, page).x).toBe(206)
  })
})

describe('undo history', () => {
  it('undoes and redoes', () => {
    const h = createHistory('a')
    h.commit('b'); h.commit('c')
    expect(h.present).toBe('c')
    expect(h.undo()).toBe('b')
    expect(h.undo()).toBe('a')
    expect(h.canUndo).toBe(false)
    expect(h.redo()).toBe('b')
    expect(h.canRedo).toBe(true)
  })
  it('a new change clears the redo stack', () => {
    const h = createHistory(1)
    h.commit(2); h.undo(); h.commit(3)
    expect(h.canRedo).toBe(false)
    expect(h.present).toBe(3)
  })
  it('merges quick changes with the same key into one step', () => {
    const h = createHistory('')
    h.commit('h', 'typing', 1000)
    h.commit('he', 'typing', 1200)
    h.commit('hel', 'typing', 1400)
    expect(h.undo()).toBe('')
  })
  it('does not merge after a pause, or across different keys', () => {
    const h = createHistory('')
    h.commit('a', 'typing', 1000)
    h.commit('ab', 'typing', 3000)
    expect(h.undo()).toBe('a')
    const g = createHistory(0)
    g.commit(1, 'move', 1000)
    g.commit(2, 'resize', 1100)
    expect(g.undo()).toBe(1)
  })
  it('ignores unchanged states and keeps a bounded history', () => {
    const h = createHistory(0, 3)
    h.commit(0)
    expect(h.canUndo).toBe(false)
    for (let i = 1; i <= 10; i++) h.commit(i)
    let steps = 0
    while (h.canUndo) { h.undo(); steps++ }
    expect(steps).toBe(3)
  })
  it('can end a merge window so the next change is its own step', () => {
    const h = createHistory('')
    h.commit('a', 'typing', 1000)
    h.breakMerge()
    h.commit('ab', 'typing', 1100)
    expect(h.undo()).toBe('a')
  })
  it('can be reset', () => {
    const h = createHistory(1)
    h.commit(2)
    h.reset(9)
    expect(h.present).toBe(9)
    expect(h.canUndo || h.canRedo).toBe(false)
  })
  it('undo and redo on an empty stack are harmless', () => {
    const h = createHistory('x')
    expect(h.undo()).toBe('x')
    expect(h.redo()).toBe('x')
  })
})
