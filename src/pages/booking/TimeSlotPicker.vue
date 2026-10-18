<template>
  <div>
    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] font-semibold text-slate-400">
      <span class="flex items-center gap-1.5">
        <span :class="['w-3 h-3 border border-gray-300 bg-white', refined ? 'rounded-full' : 'rounded']"></span> Available
      </span>
      <span class="flex items-center gap-1.5">
        <span :class="['w-3 h-3', refined ? 'rounded-full' : 'rounded']" :style="{ background: primaryColor }"></span> Your choice
      </span>
      <span class="flex items-center gap-1.5">
        <span :class="['w-3 h-3 bg-slate-200', refined ? 'rounded-full' : 'rounded']"></span> Taken
      </span>
      <span v-if="!loading && states.length" class="ml-auto font-bold"
        :class="availableCount ? 'text-emerald-600' : 'text-red-500'">
        {{ availableCount }} of {{ states.length }} available
      </span>
    </div>

    <!-- Closed -->
    <div v-if="!slots.length" class="flex items-center gap-3 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3">
      <span class="material-icons text-slate-400 text-[20px] shrink-0">event_busy</span>
      <p class="text-sm text-slate-600 flex-1">The clinic is closed on this day.</p>
      <button type="button" @click="$emit('next-day')"
        class="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
        Next open day
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-busy="true" aria-label="Checking availability">
      <div v-for="n in 8" :key="n" :class="['h-[46px] bg-slate-100 animate-pulse', refined ? 'rounded-full' : 'rounded-xl']"></div>
    </div>

    <template v-else>
      <div v-for="group in groups" :key="group.period" class="mb-3 last:mb-0">
        <p class="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          <span class="material-icons text-[14px]">{{ group.period === 'morning' ? 'wb_sunny' : 'wb_twilight' }}</span>
          {{ group.period === 'morning' ? 'Morning' : 'Afternoon' }}
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button v-for="slot in group.slots" :key="slot.label" type="button"
            :disabled="slot.state !== 'available'"
            :aria-pressed="selected === slot.label"
            :title="slot.state === 'booked' ? 'This time is already booked' : slot.state === 'past' ? 'This time has passed' : ''"
            @click="$emit('update:selected', slot.label)"
            :class="['relative py-2.5 px-1 text-[13px] sm:text-sm font-bold border transition-all focus:outline-none focus-visible:ring-2',
              refined ? 'rounded-full' : 'rounded-xl',
              slot.state === 'available' && selected !== slot.label ? (refined ? 'bg-transparent border-stone-300 text-stone-700 hover:border-stone-500 active:scale-95' : 'bg-white border-gray-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95') : '',
              selected === slot.label && slot.state === 'available' ? 'text-white border-transparent shadow-sm' : '',
              slot.state === 'booked' ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed' : '',
              slot.state === 'past' ? 'bg-transparent border-dashed border-gray-200 text-slate-300 cursor-not-allowed' : '']"
            :style="selected === slot.label && slot.state === 'available' ? { background: primaryColor } : {}">
            <span :class="['whitespace-nowrap', slot.state !== 'available' ? 'line-through decoration-slate-300' : '']">{{ rangeLabel(slot) }}</span>
            <span v-if="slot.state === 'booked'"
              class="block text-[9px] font-bold uppercase tracking-wide text-slate-400 -mt-0.5 no-underline">Booked</span>
            <span v-else-if="slot.state === 'past'"
              class="block text-[9px] font-bold uppercase tracking-wide text-slate-300 -mt-0.5">Passed</span>
          </button>
        </div>
      </div>

      <!-- Nothing left -->
      <div v-if="states.length && availableCount === 0"
        class="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <span class="material-icons text-amber-500 text-[20px] shrink-0">event_busy</span>
        <p class="text-sm text-amber-800 flex-1">No times left on this date.</p>
        <button type="button" @click="$emit('next-day')"
          class="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors shrink-0">
          Try next day
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { rangeLabel, type Slot } from '@/utils/bookingHours'

const props = defineProps<{
  selected: string
  /** The times the clinic offers on this date (empty when it is closed) */
  slots: Slot[]
  /** Slot labels that are already taken for the chosen date (and doctor) */
  booked: string[]
  /** The date being viewed, and the clinic's current date/time, for graying out past times */
  date: string
  today: string
  nowMinutes: number
  loading: boolean
  primaryColor: string
  look?: 'classic' | 'refined'
}>()

defineEmits<{
  (e: 'update:selected', v: string): void
  (e: 'next-day'): void
}>()

const refined = computed(() => props.look === 'refined')

type SlotState = 'available' | 'booked' | 'past'

const states = computed(() =>
  props.slots.map(slot => {
    const isPast = props.date === props.today && slot.minutes <= props.nowMinutes
    const state: SlotState = isPast ? 'past' : props.booked.includes(slot.label) ? 'booked' : 'available'
    return { ...slot, state }
  }),
)

const availableCount = computed(() => states.value.filter(s => s.state === 'available').length)

const groups = computed(() =>
  (['morning', 'afternoon'] as const)
    .map(period => ({ period, slots: states.value.filter(s => s.period === period) }))
    .filter(g => g.slots.length),
)
</script>
