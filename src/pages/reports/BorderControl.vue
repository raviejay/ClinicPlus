<template>
  <div class="mt-3">
    <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
      <input type="checkbox" :checked="!!border" class="accent-sky-500"
        @change="emit('change', ($event.target as HTMLInputElement).checked ? { width: 0.3, color: '#94a3b8', radius: 0, style: 'solid' } : undefined)" />
      Border
    </label>
    <div v-if="border" class="grid grid-cols-2 gap-2">
      <label class="block"><span class="block text-[11px] font-semibold text-slate-500 mb-0.5">Width (mm)</span>
        <input type="number" min="0.1" max="5" step="0.1" :value="border.width" @input="set({ width: num($event) })" class="inp" /></label>
      <label class="block"><span class="block text-[11px] font-semibold text-slate-500 mb-0.5">Color</span>
        <input type="color" :value="border.color" @input="set({ color: ($event.target as HTMLInputElement).value })"
          class="h-8 w-full rounded-lg border border-gray-200 p-0.5 bg-white" /></label>
      <label class="block"><span class="block text-[11px] font-semibold text-slate-500 mb-0.5">Corners (mm)</span>
        <input type="number" min="0" max="50" step="0.5" :value="border.radius" @input="set({ radius: num($event) })" class="inp" /></label>
      <label class="block"><span class="block text-[11px] font-semibold text-slate-500 mb-0.5">Style</span>
        <select :value="border.style" @change="set({ style: ($event.target as HTMLSelectElement).value as Border['style'] })" class="inp">
          <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Border } from '@/utils/documents/types'

const props = defineProps<{ border?: Border }>()
const emit = defineEmits<{ (e: 'change', value: Border | undefined): void }>()

const num = (e: Event) => Number((e.target as HTMLInputElement).value)
const set = (patch: Partial<Border>) => { if (props.border) emit('change', { ...props.border, ...patch }) }
</script>

<style scoped>
.inp { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.6rem; padding: 0.4rem 0.55rem; font-size: 0.8rem; background: #f8fafc; }
.inp:focus { outline: 2px solid #38bdf8; background: #fff; }
</style>
