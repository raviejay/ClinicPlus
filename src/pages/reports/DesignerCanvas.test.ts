import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import DesignerCanvas from './DesignerCanvas.vue'
import { makeBox, makeLine, makeText } from '@/utils/documents/elements'
import { emptyLayout } from '@/utils/documents/sanitize'
import type { DocLayout } from '@/utils/documents/types'

const ZOOM = 2 // px per mm: 20px of pointer travel = 10mm

const layout = (): DocLayout => ({
  ...emptyLayout('a4'),
  elements: [
    makeText('a', 20, 30, 60, 10, 'Alpha'),
    makeText('b', 100, 30, 60, 10, 'Beta'),
    makeBox('lock', 20, 100, 40, 20, { locked: true } as any),
    makeLine('rule', 20, 150, 100),
  ],
})

let wrapper: VueWrapper
const mountCanvas = (over: Record<string, unknown> = {}) => {
  wrapper = mount(DesignerCanvas, {
    props: { layout: layout(), selectedId: null, zoom: ZOOM, grid: 0, showGrid: false, snapGuides: false, data: { values: {}, medicines: [] }, ...over },
    attachTo: document.body,
  })
  return wrapper
}
const target = (id: string) => wrapper.find(`[data-id="${id}"]`)
const pointer = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
  new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, ...extra })

async function drag(el: ReturnType<typeof target>, from: [number, number], to: [number, number], extra: Record<string, unknown> = {}) {
  el.element.dispatchEvent(pointer('pointerdown', from[0], from[1]))
  window.dispatchEvent(pointer('pointermove', to[0], to[1], extra))
  window.dispatchEvent(pointer('pointerup', to[0], to[1]))
  await wrapper.vm.$nextTick()
}

afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

describe('designer canvas: drawing', () => {
  it('is the size of the paper at the current zoom', () => {
    mountCanvas()
    const style = (wrapper.find('[data-test="canvas"]').element as HTMLElement).style
    expect(style.width).toBe('420px') // 210 mm * 2
    expect(style.height).toBe('594px') // 297 mm * 2
  })
  it('draws the page the way it prints, and one target per element', () => {
    mountCanvas()
    expect(wrapper.html()).toContain('Alpha')
    expect(wrapper.findAll('[role="button"]')).toHaveLength(4)
  })
  it('shows resize handles only on the selected, unlocked element', () => {
    mountCanvas({ selectedId: 'a' })
    expect(target('a').findAll('[data-handle]')).toHaveLength(8)
    expect(target('b').findAll('[data-handle]')).toHaveLength(0)
  })
  it('does not show handles on a locked element', () => {
    mountCanvas({ selectedId: 'lock' })
    expect(target('lock').findAll('[data-handle]')).toHaveLength(0)
    expect(target('lock').text()).toContain('locked')
  })
  it('gives thin elements like lines a bigger click target', () => {
    mountCanvas()
    const style = (target('rule').element as HTMLElement).style
    expect(parseFloat(style.height)).toBeGreaterThanOrEqual(12)
  })
  it('draws the safe margin guide and, when asked, the grid', () => {
    mountCanvas({ showGrid: true, grid: 5 })
    expect(wrapper.html()).toContain('border-dashed')
    expect(wrapper.html()).toContain('background-size')
  })
})

describe('designer canvas: selecting', () => {
  it('selects an element on click', async () => {
    mountCanvas()
    await drag(target('b'), [300, 80], [300, 80])
    expect(wrapper.emitted('select')?.[0]).toEqual(['b'])
  })
  it('does not treat a click as a move', async () => {
    mountCanvas()
    await drag(target('a'), [100, 80], [101, 81]) // 1px wobble
    expect(wrapper.emitted('commit-rect')).toBeUndefined()
  })
  it('deselects when the page background is clicked', async () => {
    mountCanvas({ selectedId: 'a' })
    await wrapper.find('[data-test="canvas"]').trigger('pointerdown')
    expect(wrapper.emitted('select')?.pop()).toEqual([null])
  })
  it('selects with the keyboard', async () => {
    mountCanvas()
    await target('b').trigger('keydown.enter')
    expect(wrapper.emitted('select')?.[0]).toEqual(['b'])
  })
  it('labels targets for screen readers', () => {
    mountCanvas({ selectedId: 'b' })
    expect(target('a').attributes('aria-label')).toBe('Alpha')
    expect(target('b').attributes('aria-pressed')).toBe('true')
    expect(target('lock').attributes('aria-label')).toContain('locked')
  })
})

describe('designer canvas: moving', () => {
  it('moves by the distance dragged, in millimetres', async () => {
    mountCanvas({ selectedId: 'a' })
    await drag(target('a'), [100, 80], [140, 100]) // +40px,+20px = +20mm,+10mm
    expect(wrapper.emitted('commit-rect')?.[0]).toEqual(['a', { x: 40, y: 40, w: 60, h: 10 }])
  })
  it('selects the element it starts dragging', async () => {
    mountCanvas()
    await drag(target('a'), [100, 80], [140, 100])
    expect(wrapper.emitted('select')?.[0]).toEqual(['a'])
  })
  it('snaps to the grid', async () => {
    mountCanvas({ grid: 5 })
    await drag(target('a'), [100, 80], [117, 80]) // +8.5mm -> x = 28.5 -> 30
    expect(wrapper.emitted('commit-rect')?.[0]?.[1]).toMatchObject({ x: 30 })
  })
  it('snaps an edge to another element and shows a guide while dragging', async () => {
    mountCanvas({ snapGuides: true })
    const el = target('a')
    el.element.dispatchEvent(pointer('pointerdown', 100, 80))
    window.dispatchEvent(pointer('pointermove', 100 + 79 * ZOOM / 1, 80)) // x = 20 + 79 = 99 → snaps to b at 100
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('bg-fuchsia-500')
    window.dispatchEvent(pointer('pointerup', 0, 0))
    expect(wrapper.emitted('commit-rect')?.[0]?.[1]).toMatchObject({ x: 100 })
  })
  it('moves freely while Alt is held', async () => {
    mountCanvas({ snapGuides: true })
    await drag(target('a'), [100, 80], [100 + 79 * ZOOM, 80], { altKey: true })
    expect(wrapper.emitted('commit-rect')?.[0]?.[1]).toMatchObject({ x: 99 })
  })
  it('shows the position and size while dragging, and clears it afterwards', async () => {
    mountCanvas()
    target('a').element.dispatchEvent(pointer('pointerdown', 100, 80))
    window.dispatchEvent(pointer('pointermove', 140, 80))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/40, 30 · 60 × 10 mm/)
    window.dispatchEvent(pointer('pointerup', 140, 80))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toMatch(/ mm$/)
  })
  it('does not move a locked element', async () => {
    mountCanvas({ selectedId: 'lock' })
    await drag(target('lock'), [60, 220], [120, 260])
    expect(wrapper.emitted('commit-rect')).toBeUndefined()
    expect(wrapper.emitted('select')?.[0]).toEqual(['lock']) // but it can be selected
  })
  it('keeps part of the element on the page', async () => {
    mountCanvas()
    await drag(target('a'), [100, 80], [100 + 5000, 80])
    expect((wrapper.emitted('commit-rect')?.[0]?.[1] as any).x).toBeLessThan(210)
  })
  it('follows the pointer live without changing the layout', async () => {
    mountCanvas()
    target('a').element.dispatchEvent(pointer('pointerdown', 100, 80))
    window.dispatchEvent(pointer('pointermove', 140, 80))
    await wrapper.vm.$nextTick()
    expect(target('a').attributes('style')).toContain('left: 80px') // 40mm * 2
    window.dispatchEvent(pointer('pointerup', 140, 80))
  })
})

describe('designer canvas: resizing', () => {
  const handle = (h: string) => target('a').find(`[data-handle="${h}"]`)
  async function resize(h: string, to: [number, number]) {
    handle(h).element.dispatchEvent(pointer('pointerdown', 0, 0))
    window.dispatchEvent(pointer('pointermove', to[0], to[1]))
    window.dispatchEvent(pointer('pointerup', to[0], to[1]))
    await wrapper.vm.$nextTick()
  }

  it('drags the bottom-right corner', async () => {
    mountCanvas({ selectedId: 'a' })
    await resize('se', [20, 10]) // +10mm, +5mm
    expect(wrapper.emitted('commit-rect')?.[0]).toEqual(['a', { x: 20, y: 30, w: 70, h: 15 }])
  })
  it('drags the left edge, keeping the right edge fixed', async () => {
    mountCanvas({ selectedId: 'a' })
    await resize('w', [20, 0])
    expect(wrapper.emitted('commit-rect')?.[0]).toEqual(['a', { x: 30, y: 30, w: 50, h: 10 }])
  })
  it('never makes an element smaller than 2 mm', async () => {
    mountCanvas({ selectedId: 'a' })
    await resize('e', [-2000, 0])
    expect(wrapper.emitted('commit-rect')?.[0]?.[1]).toMatchObject({ x: 20, w: 2 })
  })
  it('snaps the dragged edge to the grid', async () => {
    mountCanvas({ selectedId: 'a', grid: 5 })
    await resize('e', [14, 0]) // +7mm -> right edge 87 -> 85
    expect(wrapper.emitted('commit-rect')?.[0]?.[1]).toMatchObject({ w: 65 })
  })
  it('does not start a move when a handle is grabbed', async () => {
    mountCanvas({ selectedId: 'a' })
    await resize('se', [20, 10])
    expect(wrapper.emitted('commit-rect')).toHaveLength(1)
  })
})
