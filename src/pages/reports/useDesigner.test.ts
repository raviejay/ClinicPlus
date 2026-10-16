import { describe, expect, it } from 'vitest'
import { useDesigner } from './useDesigner'
import { presetLayout } from '@/utils/documents/presets'
import { emptyLayout } from '@/utils/documents/sanitize'
import { makeBox, makeText } from '@/utils/documents/elements'
import type { DocLayout } from '@/utils/documents/types'

const small = (): DocLayout => ({
  ...emptyLayout('a4'),
  elements: [makeText('a', 10, 10, 50, 10, 'A'), makeText('b', 20, 30, 50, 10, 'B'), makeBox('c', 30, 50, 20, 20)],
})

describe('designer: selecting and editing', () => {
  it('selects an element, and ignores ids that do not exist', () => {
    const d = useDesigner(small())
    d.select('b')
    expect(d.selected.value?.id).toBe('b')
    d.select('nope')
    expect(d.selected.value).toBeNull()
    d.select('b'); d.select(null)
    expect(d.selectedId.value).toBeNull()
  })

  it('edits a property and keeps the rest', () => {
    const d = useDesigner(small())
    d.patchElement('a', { content: 'Hello', bold: true })
    expect(d.layout.value.elements[0]).toMatchObject({ id: 'a', content: 'Hello', bold: true, x: 10 })
  })

  it('cleans up what is typed in (out-of-range numbers, bad colors)', () => {
    const d = useDesigner(small())
    d.patchElement('a', { size: 9999, color: 'not-a-color' } as any)
    expect(d.layout.value.elements[0]).toMatchObject({ size: 72, color: '#1e293b' })
  })

  it('moves and resizes, keeping part of the element on the page', () => {
    const d = useDesigner(small())
    d.setRect('a', { x: 40, y: 50, w: 60, h: 12 })
    expect(d.layout.value.elements[0]).toMatchObject({ x: 40, y: 50, w: 60, h: 12 })
    d.setRect('a', { x: 5000, y: 5000, w: 60, h: 12 })
    expect(d.layout.value.elements[0].x).toBeLessThan(210)
  })

  it('does not move a locked element', () => {
    const d = useDesigner(small())
    d.toggleLock('a')
    expect(d.layout.value.elements[0].locked).toBe(true)
    d.setRect('a', { x: 99, y: 99, w: 10, h: 10 })
    expect(d.layout.value.elements[0]).toMatchObject({ x: 10, y: 10 })
    d.toggleLock('a')
    expect(d.layout.value.elements[0].locked).toBeUndefined()
    d.setRect('a', { x: 99, y: 99, w: 10, h: 10 })
    expect(d.layout.value.elements[0]).toMatchObject({ x: 99, y: 99 })
  })
})

describe('designer: adding and removing', () => {
  it('adds each kind of element and selects it', () => {
    const d = useDesigner(emptyLayout())
    for (const type of ['text', 'image', 'line', 'box', 'medicines'] as const) {
      const el = d.addElement(type)
      expect(el?.type).toBe(type)
      expect(d.selectedId.value).toBe(el?.id)
    }
    expect(d.layout.value.elements).toHaveLength(5)
    expect(new Set(d.layout.value.elements.map(e => e.id)).size).toBe(5)
  })

  it('adds a text element holding a field', () => {
    const d = useDesigner(emptyLayout())
    const el = d.addTextWith('{patient_name}') as any
    expect(el.content).toBe('{patient_name}')
  })

  it('deletes the selected element', () => {
    const d = useDesigner(small())
    d.select('b'); d.removeSelected()
    expect(d.layout.value.elements.map(e => e.id)).toEqual(['a', 'c'])
    expect(d.selectedId.value).toBeNull()
  })

  it('duplicates the selected element and selects the copy', () => {
    const d = useDesigner(small())
    d.select('a'); d.duplicateSelected()
    expect(d.layout.value.elements).toHaveLength(4)
    expect(d.selected.value?.id).not.toBe('a')
    expect(d.selected.value).toMatchObject({ x: 14, y: 14 })
  })

  it('stops at 100 elements with a message', () => {
    const many: DocLayout = { ...emptyLayout(), elements: Array.from({ length: 100 }, (_, i) => makeBox(`b${i}`, 1, 1, 5, 5)) }
    const d = useDesigner(many)
    expect(d.addElement('text')).toBeNull()
    expect(d.notice.value).toContain('100')
    expect(d.layout.value.elements).toHaveLength(100)
  })
})

describe('designer: layers and alignment', () => {
  const order = (d: ReturnType<typeof useDesigner>) => d.layout.value.elements.map(e => e.id).join('')

  it('moves an element forward and back', () => {
    const d = useDesigner(small())
    d.reorder('a', 1); expect(order(d)).toBe('bac')
    d.reorder('a', -1); expect(order(d)).toBe('abc')
    d.reorder('a', -1); expect(order(d)).toBe('abc') // already at the back
  })
  it('sends to the front and back', () => {
    const d = useDesigner(small())
    d.toFront('a'); expect(order(d)).toBe('bca')
    d.toBack('c'); expect(order(d)).toBe('cba')
  })
  it('aligns the selected element to the page inside the margin', () => {
    const d = useDesigner(small())
    d.select('a')
    d.alignSelected('center'); expect(d.layout.value.elements[0].x).toBe(80)
    d.alignSelected('left'); expect(d.layout.value.elements[0].x).toBe(8)
    d.alignSelected('right'); expect(d.layout.value.elements[0].x).toBe(152)
  })
})

describe('designer: paper', () => {
  it('changes the paper size and orientation', () => {
    const d = useDesigner(small())
    d.setPaper({ size: 'letter' })
    expect(d.page.value).toEqual({ w: 215.9, h: 279.4 })
    d.setPaper({ orientation: 'landscape' })
    expect(d.page.value).toEqual({ w: 279.4, h: 215.9 })
    d.setPaper({ margin: 99 })
    expect(d.layout.value.paper.margin).toBe(40)
  })
})

describe('designer: undo, redo and unsaved changes', () => {
  it('starts clean and becomes dirty after a change', () => {
    const d = useDesigner(small())
    expect(d.dirty.value).toBe(false)
    d.patchElement('a', { content: 'X' })
    expect(d.dirty.value).toBe(true)
  })
  it('is clean again after saving, or after undoing the only change', () => {
    const d = useDesigner(small())
    d.patchElement('a', { content: 'X' })
    d.markSaved()
    expect(d.dirty.value).toBe(false)
    d.patchElement('a', { content: 'Y' })
    expect(d.dirty.value).toBe(true)
    d.undo()
    expect(d.dirty.value).toBe(false)
  })
  it('undoes and redoes edits, adds and deletes', () => {
    const d = useDesigner(small())
    expect(d.canUndo.value).toBe(false)
    d.addElement('line')
    d.select('a'); d.removeSelected()
    expect(d.layout.value.elements).toHaveLength(3)
    d.undo(); expect(d.layout.value.elements).toHaveLength(4)
    d.undo(); expect(d.layout.value.elements).toHaveLength(3)
    expect(d.canUndo.value).toBe(false)
    expect(d.canRedo.value).toBe(true)
    d.redo(); d.redo()
    expect(d.layout.value.elements).toHaveLength(3)
    expect(d.layout.value.elements.find(e => e.id === 'a')).toBeUndefined()
  })
  it('deselects an element that undo removes', () => {
    const d = useDesigner(small())
    const el = d.addElement('box')!
    expect(d.selectedId.value).toBe(el.id)
    d.undo()
    expect(d.selectedId.value).toBeNull()
  })
  it('merges rapid edits of the same property into one undo step', () => {
    const d = useDesigner(small())
    d.patchElement('a', { content: 'H' }, 'typing')
    d.patchElement('a', { content: 'He' }, 'typing')
    d.patchElement('a', { content: 'Hel' }, 'typing')
    d.undo()
    expect((d.layout.value.elements[0] as any).content).toBe('A')
  })
  it('applying a preset replaces the layout and can be undone', () => {
    const d = useDesigner(small())
    d.replaceLayout(presetLayout('medcert', 'classic'))
    expect(d.layout.value.elements.length).toBeGreaterThan(5)
    d.undo()
    expect(d.layout.value.elements).toHaveLength(3)
  })
})
