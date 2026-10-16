// State and actions of the document designer: the layout being edited, what is selected,
// and undo/redo. No DOM in here, so it is easy to test.

import { computed, ref } from 'vue'
import { createHistory } from '@/utils/documents/history'
import { createElement, duplicateElement, makeText, nextId } from '@/utils/documents/elements'
import { alignRect, clampOnPage, type AlignTo, type Rect } from '@/utils/documents/geometry'
import { sanitizeLayout } from '@/utils/documents/sanitize'
import { MAX_ELEMENTS, paperDimensions, type DocElement, type DocLayout, type ElementType } from '@/utils/documents/types'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export function useDesigner(initial: DocLayout) {
  const start = sanitizeLayout(initial)
  const history = createHistory<DocLayout>(start)

  const layout = ref<DocLayout>(start)
  const selectedId = ref<string | null>(null)
  const savedSnapshot = ref(JSON.stringify(start))
  const notice = ref('')

  const selected = computed(() => layout.value.elements.find(e => e.id === selectedId.value) ?? null)
  const page = computed(() => paperDimensions(layout.value.paper))
  const dirty = computed(() => JSON.stringify(layout.value) !== savedSnapshot.value)
  const canUndo = computed(() => { void layout.value; return history.canUndo })
  const canRedo = computed(() => { void layout.value; return history.canRedo })

  function commit(next: DocLayout, mergeKey?: string) {
    history.commit(next, mergeKey)
    layout.value = next
  }

  function select(id: string | null) {
    selectedId.value = id && layout.value.elements.some(e => e.id === id) ? id : null
  }

  function patchElement(id: string, patch: Partial<DocElement>, mergeKey?: string) {
    const next: DocLayout = {
      ...layout.value,
      elements: layout.value.elements.map(e => (e.id === id ? ({ ...e, ...patch } as DocElement) : e)),
    }
    // Run it through the sanitizer so typed-in numbers and colors are always valid
    commit(sanitizeLayout(next), mergeKey ?? `edit:${id}:${Object.keys(patch).join(',')}`)
  }

  function setRect(id: string, rect: Rect, mergeKey?: string) {
    const el = layout.value.elements.find(e => e.id === id)
    if (!el || el.locked) return
    const fit = clampOnPage(rect, page.value)
    patchElement(id, { x: fit.x, y: fit.y, w: fit.w, h: fit.h }, mergeKey ?? `rect:${id}`)
  }

  function addElement(type: ElementType): DocElement | null {
    if (layout.value.elements.length >= MAX_ELEMENTS) {
      notice.value = `A template can have up to ${MAX_ELEMENTS} elements.`
      return null
    }
    const el = createElement(layout.value, type)
    commit({ ...layout.value, elements: [...layout.value.elements, el] })
    selectedId.value = el.id
    return el
  }

  /** Adds a text element holding the given text (used when a field is inserted with no text selected) */
  function addTextWith(content: string): DocElement | null {
    if (layout.value.elements.length >= MAX_ELEMENTS) return null
    const m = layout.value.paper.margin + 4
    const el = makeText(nextId(layout.value, 'text'), m, m + 6, 80, 8, content)
    commit({ ...layout.value, elements: [...layout.value.elements, el] })
    selectedId.value = el.id
    return el
  }

  function removeSelected() {
    const id = selectedId.value
    if (!id) return
    commit({ ...layout.value, elements: layout.value.elements.filter(e => e.id !== id) })
    selectedId.value = null
  }

  function duplicateSelected() {
    const el = selected.value
    if (!el || layout.value.elements.length >= MAX_ELEMENTS) return
    const copy = duplicateElement(layout.value, el)
    commit({ ...layout.value, elements: [...layout.value.elements, copy] })
    selectedId.value = copy.id
  }

  /** Moves an element one step towards the front (+1) or the back (-1) */
  function reorder(id: string, direction: 1 | -1) {
    const list = [...layout.value.elements]
    const i = list.findIndex(e => e.id === id)
    const j = i + direction
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    commit({ ...layout.value, elements: list })
  }

  function toFront(id: string) {
    const list = layout.value.elements
    const el = list.find(e => e.id === id)
    if (!el || list[list.length - 1].id === id) return
    commit({ ...layout.value, elements: [...list.filter(e => e.id !== id), el] })
  }

  function toBack(id: string) {
    const list = layout.value.elements
    const el = list.find(e => e.id === id)
    if (!el || list[0].id === id) return
    commit({ ...layout.value, elements: [el, ...list.filter(e => e.id !== id)] })
  }

  function toggleLock(id: string) {
    const el = layout.value.elements.find(e => e.id === id)
    if (!el) return
    patchElement(id, { locked: el.locked ? undefined : true } as Partial<DocElement>, `lock:${id}`)
    // sanitizeLayout drops locked: false, so unlocking simply removes the flag
  }

  function alignSelected(how: AlignTo) {
    const el = selected.value
    if (!el || el.locked) return
    const next = alignRect({ x: el.x, y: el.y, w: el.w, h: el.h }, page.value, how, layout.value.paper.margin)
    setRect(el.id, next, `align:${el.id}`)
  }

  function setPaper(patch: Partial<DocLayout['paper']>) {
    commit(sanitizeLayout({ ...layout.value, paper: { ...layout.value.paper, ...patch } }), 'paper')
  }

  /** Replaces the whole layout (applying a preset); can be undone */
  function replaceLayout(next: DocLayout) {
    commit(sanitizeLayout(clone(next)))
    selectedId.value = null
  }

  function undo() {
    layout.value = history.undo()
    if (selectedId.value && !layout.value.elements.some(e => e.id === selectedId.value)) selectedId.value = null
  }

  function redo() {
    layout.value = history.redo()
    if (selectedId.value && !layout.value.elements.some(e => e.id === selectedId.value)) selectedId.value = null
  }

  function markSaved() {
    savedSnapshot.value = JSON.stringify(layout.value)
    // Edits after saving are their own undo steps, so undo can return to exactly what was saved
    history.breakMerge()
  }

  return {
    layout, selectedId, selected, page, dirty, canUndo, canRedo, notice,
    select, patchElement, setRect, addElement, addTextWith, removeSelected, duplicateSelected,
    reorder, toFront, toBack, toggleLock, alignSelected, setPaper, replaceLayout, undo, redo, markSaved,
  }
}

export type Designer = ReturnType<typeof useDesigner>
