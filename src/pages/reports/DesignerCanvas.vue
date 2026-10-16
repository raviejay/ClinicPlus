<template>
  <div class="relative select-none touch-none bg-white shadow-lg ring-1 ring-black/10"
    :style="{ width: pageW * zoom + 'px', height: pageH * zoom + 'px' }"
    data-test="canvas" @pointerdown.self="$emit('select', null)">

    <!-- The page itself, drawn by the same code that prints it -->
    <div class="absolute left-0 top-0 pointer-events-none origin-top-left"
      :style="{ transform: `scale(${zoom / MM_TO_PX})`, width: pageW + 'mm', height: pageH + 'mm' }" v-html="html"></div>

    <!-- Grid -->
    <div v-if="showGrid && grid > 0" class="absolute inset-0 pointer-events-none" :style="gridStyle"></div>

    <!-- Safe printing margin -->
    <div v-if="layout.paper.margin > 0" class="absolute pointer-events-none border border-dashed border-sky-300/70"
      :style="{ left: m * zoom + 'px', top: m * zoom + 'px', right: m * zoom + 'px', bottom: m * zoom + 'px' }"></div>

    <!-- Click and drag targets -->
    <div v-for="el in live.elements" :key="el.id" role="button" tabindex="0"
      :data-id="el.id" :aria-pressed="el.id === selectedId" :aria-label="elementTitle(el) + (el.locked ? ' (locked)' : '')"
      :class="['absolute outline-none', el.id === selectedId ? 'ring-2 ring-sky-500 z-20' : 'hover:ring-1 hover:ring-sky-300 focus-visible:ring-2 focus-visible:ring-sky-400',
        el.locked ? 'cursor-default' : 'cursor-move']"
      :style="hitBox(el)"
      @pointerdown.stop="onElementDown($event, el)"
      @keydown.enter.prevent="$emit('select', el.id)">
      <span v-if="el.locked && el.id === selectedId" class="absolute -top-5 left-0 text-[10px] bg-slate-700 text-white px-1.5 py-0.5 rounded">locked</span>
      <template v-if="el.id === selectedId && !el.locked">
        <span v-for="h in HANDLES" :key="h" :data-handle="h"
          class="absolute w-2.5 h-2.5 bg-white border-2 border-sky-500 rounded-sm z-30"
          :style="handleStyle(h)" @pointerdown.stop.prevent="onHandleDown($event, el, h)"></span>
      </template>
    </div>

    <!-- Alignment guides while dragging -->
    <div v-for="g in guides" :key="g.axis + g.at" class="absolute pointer-events-none bg-fuchsia-500 z-30"
      :style="g.axis === 'x' ? { left: g.at * zoom + 'px', top: 0, bottom: 0, width: '1px' } : { top: g.at * zoom + 'px', left: 0, right: 0, height: '1px' }"></div>

    <!-- Size while dragging -->
    <div v-if="override" class="absolute z-40 pointer-events-none text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap"
      :style="{ left: override.rect.x * zoom + 'px', top: Math.max(0, override.rect.y * zoom - 22) + 'px' }">
      {{ fmt(override.rect.x) }}, {{ fmt(override.rect.y) }} · {{ fmt(override.rect.w) }} × {{ fmt(override.rect.h) }} mm
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { renderPageHtml } from '@/utils/documents/render'
import { HANDLES, moveRect, resizeRect, snapToGuides, type Guide, type Handle, type Rect } from '@/utils/documents/geometry'
import { elementTitle } from '@/utils/documents/elements'
import { paperDimensions, type DocData, type DocElement, type DocLayout } from '@/utils/documents/types'

const MM_TO_PX = 96 / 25.4
/** Pointer must travel this many pixels before a click becomes a drag */
const DRAG_THRESHOLD = 3

const props = defineProps<{
  layout: DocLayout
  selectedId: string | null
  /** Pixels per millimetre */
  zoom: number
  /** Snap grid in mm (0 = off) */
  grid: number
  showGrid: boolean
  /** Snap to other elements and the page edges/centre */
  snapGuides: boolean
  data: DocData
  logoUrl?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string | null): void
  /** An element was dropped or resized: the final rectangle */
  (e: 'commit-rect', id: string, rect: Rect): void
}>()

const page = computed(() => paperDimensions(props.layout.paper))
const pageW = computed(() => page.value.w)
const pageH = computed(() => page.value.h)
const m = computed(() => props.layout.paper.margin)

// While dragging, one element is shown at its in-progress rectangle without touching the saved layout
const override = ref<{ id: string; rect: Rect } | null>(null)
const guides = ref<Guide[]>([])

const live = computed<DocLayout>(() => {
  const o = override.value
  if (!o) return props.layout
  return {
    ...props.layout,
    elements: props.layout.elements.map(e => (e.id === o.id ? ({ ...e, ...o.rect } as DocElement) : e)),
  }
})

const html = computed(() => renderPageHtml(live.value, props.data, { clinicLogoUrl: props.logoUrl ?? null }))

const gridStyle = computed(() => {
  const px = props.grid * props.zoom
  // Very fine grids are noise: draw every 5th line stronger and skip the rest below ~6px
  const step = px < 6 ? px * Math.ceil(6 / px) : px
  return {
    backgroundImage:
      'linear-gradient(to right, rgba(14,165,233,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,165,233,0.12) 1px, transparent 1px)',
    backgroundSize: `${step}px ${step}px`,
  }
})

const fmt = (v: number) => Math.round(v * 10) / 10

// Thin things (lines) get a bigger target than they are drawn
const MIN_HIT = 12
function hitBox(el: DocElement) {
  const w = el.w * props.zoom
  const h = el.h * props.zoom
  const hitW = Math.max(w, MIN_HIT)
  const hitH = Math.max(h, MIN_HIT)
  return {
    left: el.x * props.zoom - (hitW - w) / 2 + 'px',
    top: el.y * props.zoom - (hitH - h) / 2 + 'px',
    width: hitW + 'px',
    height: hitH + 'px',
  }
}

function handleStyle(h: Handle) {
  const style: Record<string, string> = {}
  style[h.includes('w') ? 'left' : h.includes('e') ? 'right' : 'left'] = h.includes('w') || h.includes('e') ? '-6px' : 'calc(50% - 5px)'
  style[h.includes('n') ? 'top' : h.includes('s') ? 'bottom' : 'top'] = h.includes('n') || h.includes('s') ? '-6px' : 'calc(50% - 5px)'
  style.cursor = `${h}-resize`
  return style
}

// ── Dragging ──
interface Drag {
  mode: 'move' | 'resize'
  id: string
  handle?: Handle
  startX: number
  startY: number
  origin: Rect
  moved: boolean
  last: Rect
}
let drag: Drag | null = null

function begin(mode: Drag['mode'], e: PointerEvent, el: DocElement, handle?: Handle) {
  const origin = { x: el.x, y: el.y, w: el.w, h: el.h }
  drag = { mode, id: el.id, handle, startX: e.clientX, startY: e.clientY, origin, moved: false, last: origin }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onElementDown(e: PointerEvent, el: DocElement) {
  if (e.button !== 0) return
  emit('select', el.id)
  if (!el.locked) begin('move', e, el)
}

function onHandleDown(e: PointerEvent, el: DocElement, handle: Handle) {
  if (e.button !== 0 || el.locked) return
  begin('resize', e, el, handle)
}

function onMove(e: PointerEvent) {
  if (!drag) return
  const dxPx = e.clientX - drag.startX
  const dyPx = e.clientY - drag.startY
  if (!drag.moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD) return
  drag.moved = true

  const dx = dxPx / props.zoom
  const dy = dyPx / props.zoom
  let rect: Rect
  guides.value = []

  if (drag.mode === 'move') {
    rect = moveRect(drag.origin, dx, dy, { grid: props.grid, page: page.value })
    // Holding Alt moves freely, without snapping to other elements
    if (props.snapGuides && !e.altKey) {
      const others = props.layout.elements.filter(o => o.id !== drag!.id).map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h }))
      const snapped = snapToGuides(rect, others, page.value, m.value)
      rect = snapped.rect
      guides.value = snapped.guides
    }
  } else {
    rect = resizeRect(drag.origin, drag.handle!, dx, dy, { grid: props.grid })
  }
  drag.last = rect
  override.value = { id: drag.id, rect }
}

function onUp() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  const d = drag
  drag = null
  guides.value = []
  override.value = null
  if (d?.moved) emit('commit-rect', d.id, d.last)
}

onBeforeUnmount(onUp)
</script>
