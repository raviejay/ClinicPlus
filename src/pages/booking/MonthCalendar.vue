<template>
  <div class="select-none" role="group" aria-label="Choose a date">
    <div class="flex items-center justify-between mb-3">
      <button type="button" @click="go(-1)" :disabled="!canPrev" aria-label="Previous month"
        class="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <span class="material-icons text-[20px]">chevron_left</span>
      </button>
      <p class="text-base font-black text-slate-900" aria-live="polite">{{ label }}</p>
      <button type="button" @click="go(1)" :disabled="!canNext" aria-label="Next month"
        class="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <span class="material-icons text-[20px]">chevron_right</span>
      </button>
    </div>

    <div class="grid grid-cols-7 mb-1">
      <span v-for="d in WEEKDAYS" :key="d" class="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{{ d }}</span>
    </div>

    <div class="grid grid-cols-7 gap-y-1">
      <template v-for="(week, wi) in weeks" :key="wi">
        <div v-for="(iso, di) in week" :key="`${wi}-${di}`" class="flex items-center justify-center">
          <button v-if="iso" type="button" :disabled="iso < min || iso > max" :aria-pressed="iso === modelValue"
            :aria-label="ariaLabel(iso)" @click="$emit('update:modelValue', iso)"
            :class="['relative w-10 h-10 sm:w-11 sm:h-11 rounded-full text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              iso === modelValue ? 'text-white shadow-md scale-105' : iso < min || iso > max ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 active:scale-95']"
            :style="iso === modelValue ? { background: primaryColor } : {}">
            {{ Number(iso.slice(8)) }}
            <span v-if="iso === min && iso !== modelValue" class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" :style="{ background: primaryColor }"></span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { addDays, formatLongDate, monthLabel, monthMatrix, shiftMonth } from '@/utils/booking'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MAX_DAYS_AHEAD = 180

const props = defineProps<{
  modelValue: string
  /** Earliest bookable date (today in Manila) */
  min: string
  primaryColor: string
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const max = computed(() => addDays(props.min, MAX_DAYS_AHEAD))

const view = ref({ year: Number(props.modelValue.slice(0, 4)), month: Number(props.modelValue.slice(5, 7)) })
// Follow the chosen date if it is changed from elsewhere (e.g. "Try next day")
watch(() => props.modelValue, v => { view.value = { year: Number(v.slice(0, 4)), month: Number(v.slice(5, 7)) } })

const weeks = computed(() => monthMatrix(view.value.year, view.value.month))
const label = computed(() => monthLabel(view.value.year, view.value.month))

const ym = (y: number, m: number) => y * 12 + m
const canPrev = computed(() => ym(view.value.year, view.value.month) > ym(Number(props.min.slice(0, 4)), Number(props.min.slice(5, 7))))
const canNext = computed(() => ym(view.value.year, view.value.month) < ym(Number(max.value.slice(0, 4)), Number(max.value.slice(5, 7))))

function go(delta: number) {
  view.value = shiftMonth(view.value.year, view.value.month, delta)
}

const ariaLabel = (iso: string) => formatLongDate(iso) + (iso === props.min ? ' (today)' : '')
</script>
