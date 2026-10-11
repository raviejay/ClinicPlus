<template>
  <div>
    <div class="flex items-center gap-1.5">
      <button type="button" @click="shift(-1)" :disabled="offset <= 0" aria-label="Previous week"
        class="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <span class="material-icons text-[18px]">chevron_left</span>
      </button>

      <div class="grid grid-cols-7 gap-1 flex-1" role="group" aria-label="Choose a date">
        <button v-for="day in week" :key="day.iso" type="button" @click="$emit('update:modelValue', day.iso)"
          :aria-pressed="day.iso === modelValue"
          :class="['flex flex-col items-center py-2 rounded-xl border transition-all active:scale-95 focus:outline-none focus-visible:ring-2',
            day.iso === modelValue ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50']"
          :style="day.iso === modelValue ? { background: primaryColor } : {}">
          <span :class="['text-[10px] font-bold uppercase tracking-wide',
            day.iso === modelValue ? 'text-white/80' : day.isWeekend ? 'text-slate-300' : 'text-slate-400']">
            {{ day.isToday ? 'Today' : day.weekday }}
          </span>
          <span class="text-base font-black leading-tight">{{ day.day }}</span>
          <span :class="['text-[10px] font-semibold', day.iso === modelValue ? 'text-white/80' : 'text-slate-400']">
            {{ day.month }}
          </span>
        </button>
      </div>

      <button type="button" @click="shift(1)" :disabled="offset + 7 > maxDays" aria-label="Next week"
        class="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <span class="material-icons text-[18px]">chevron_right</span>
      </button>
    </div>

    <div class="mt-2.5 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-slate-700">{{ longDate }}</p>
      <label class="relative inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
        :style="{ color: primaryColor }">
        <span class="material-icons text-[15px]">calendar_month</span>
        Pick another date
        <input type="date" :value="modelValue" :min="min" :max="maxDate"
          @input="onPick(($event.target as HTMLInputElement).value)"
          class="absolute inset-0 opacity-0 cursor-pointer w-full" aria-label="Pick another date" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { addDays, daysBetween, dateParts, formatLongDate } from '@/utils/booking'

const props = defineProps<{
  modelValue: string
  /** Earliest bookable date (today in Manila) */
  min: string
  primaryColor: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const maxDays = 180 // how far ahead patients can book
const maxDate = computed(() => addDays(props.min, maxDays))

// First visible day, as days after `min`; always a whole page of 7
const offset = ref(0)

function alignTo(iso: string) {
  const diff = Math.max(0, Math.min(maxDays, daysBetween(props.min, iso)))
  if (diff < offset.value || diff >= offset.value + 7) offset.value = Math.floor(diff / 7) * 7
}
watch(() => props.modelValue, alignTo, { immediate: true })

const week = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(props.min, offset.value + i)
    const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
    return { iso, ...dateParts(iso), isToday: iso === props.min, isWeekend: weekday === 0 || weekday === 6 }
  }),
)

const longDate = computed(() => (props.modelValue ? formatLongDate(props.modelValue) : ''))

function shift(direction: 1 | -1) {
  offset.value = Math.max(0, Math.min(maxDays - 6, offset.value + direction * 7))
}

function onPick(value: string) {
  if (value && value >= props.min && value <= maxDate.value) emit('update:modelValue', value)
}
</script>
