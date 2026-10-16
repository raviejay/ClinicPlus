<template>
  <div ref="host" class="w-full">
    <div class="rounded-lg shadow-md ring-1 ring-black/5 overflow-hidden bg-white"
      :style="{ width: pagePx.w * scale + 'px', height: pagePx.h * scale + 'px' }">
      <div ref="holder" :style="{ width: pagePx.w + 'px', transform: `scale(${scale})`, transformOrigin: 'top left' }" v-html="html"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findOverflowingElements, renderPageHtml } from '@/utils/documents/render'
import { paperDimensions, type DocData, type DocLayout } from '@/utils/documents/types'
import { sanitizeLayout } from '@/utils/documents/sanitize'

const MM_TO_PX = 96 / 25.4

const props = defineProps<{
  layout: DocLayout
  data: DocData
  logoUrl?: string | null
  /** Largest width in pixels the page may be drawn at; it shrinks to fit its container */
  maxWidth?: number
}>()

const emit = defineEmits<{ (e: 'overflow', ids: string[]): void }>()

const host = ref<HTMLElement | null>(null)
const holder = ref<HTMLElement | null>(null)
const hostWidth = ref(0)

const safe = computed(() => sanitizeLayout(props.layout))
const pagePx = computed(() => {
  const { w, h } = paperDimensions(safe.value.paper)
  return { w: w * MM_TO_PX, h: h * MM_TO_PX }
})
const html = computed(() => renderPageHtml(safe.value, props.data, { clinicLogoUrl: props.logoUrl ?? null }))

// Fit the page to the width available (a sensible size where there is no layout, e.g. in tests)
const scale = computed(() => {
  const available = Math.min(hostWidth.value || 520, props.maxWidth ?? Infinity)
  return Math.min(1.5, Math.max(0.05, available / pagePx.value.w))
})

async function reportOverflow() {
  await nextTick()
  if (holder.value) emit('overflow', findOverflowingElements(holder.value))
}

let observer: ResizeObserver | null = null
onMounted(() => {
  if (host.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => { hostWidth.value = host.value?.clientWidth ?? 0 })
    observer.observe(host.value)
  }
  hostWidth.value = host.value?.clientWidth ?? 0
  reportOverflow()
})
onBeforeUnmount(() => observer?.disconnect())
watch(html, reportOverflow)
</script>
