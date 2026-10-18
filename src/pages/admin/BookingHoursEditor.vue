<template>
  <div class="space-y-5">
    <p class="text-xs text-slate-400">
      Patients can only book times inside these hours. Staff can still add anyone at any time from the Appointments page.
    </p>

    <!-- Appointment length -->
    <div>
      <label for="bh-length" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Each appointment lasts</label>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-2">
          <input id="bh-length" type="number" :min="MIN_SLOT_MINUTES" :max="MAX_SLOT_MINUTES" :step="SLOT_STEP" inputmode="numeric"
            :value="model.slot_minutes" @input="setLength(($event.target as HTMLInputElement).value)"
            class="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white" />
          <span class="text-sm text-slate-500">minutes</span>
        </div>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Common lengths">
          <button v-for="n in QUICK_LENGTHS" :key="n" type="button" @click="setLength(String(n))" :aria-pressed="model.slot_minutes === n"
            :class="['text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
              model.slot_minutes === n ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">
            {{ n }} min
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-400 mt-1.5">Any length from {{ MIN_SLOT_MINUTES }} to {{ MAX_SLOT_MINUTES }} minutes. Patients see each time as a range, like 8:00 – 8:30 AM.</p>
    </div>

    <!-- Week -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Weekly hours</h3>
        <button type="button" @click="copyFromFirstOpen"
          class="text-xs font-semibold text-sky-600 hover:text-sky-700">Copy {{ firstOpenName }} to the other open days</button>
      </div>

      <ul class="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        <li v-for="key in DAY_KEYS" :key="key" class="px-4 py-3" :data-day="key">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label class="flex items-center gap-3 w-40 cursor-pointer">
              <button type="button" role="switch" :aria-checked="model.days[key].open" :aria-label="`${DAY_NAMES[key]} open`"
                @click="update(key, { open: !model.days[key].open })"
                :class="['relative w-10 h-6 rounded-full transition-colors shrink-0', model.days[key].open ? 'bg-sky-500' : 'bg-gray-200']">
                <span :class="['absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', model.days[key].open ? 'translate-x-4' : '']"></span>
              </button>
              <span :class="['text-sm font-semibold', model.days[key].open ? 'text-slate-800' : 'text-slate-400']">{{ DAY_NAMES[key] }}</span>
            </label>

            <template v-if="model.days[key].open">
              <div class="flex items-center gap-2">
                <input type="time" :value="model.days[key].start" @input="update(key, { start: ($event.target as HTMLInputElement).value })"
                  :aria-label="`${DAY_NAMES[key]} opens`" :class="timeClass(key)" />
                <span class="text-xs text-slate-400">to</span>
                <input type="time" :value="model.days[key].end" @input="update(key, { end: ($event.target as HTMLInputElement).value })"
                  :aria-label="`${DAY_NAMES[key]} closes`" :class="timeClass(key)" />
              </div>

              <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" :checked="hasBreak(key)" @change="toggleBreak(key, ($event.target as HTMLInputElement).checked)"
                  :aria-label="`${DAY_NAMES[key]} has a break`" class="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400" />
                Break
              </label>
              <div v-if="hasBreak(key)" class="flex items-center gap-2">
                <input type="time" :value="model.days[key].break_start ?? ''" @input="update(key, { break_start: ($event.target as HTMLInputElement).value || null })"
                  :aria-label="`${DAY_NAMES[key]} break starts`" :class="timeClass(key)" />
                <span class="text-xs text-slate-400">to</span>
                <input type="time" :value="model.days[key].break_end ?? ''" @input="update(key, { break_end: ($event.target as HTMLInputElement).value || null })"
                  :aria-label="`${DAY_NAMES[key]} break ends`" :class="timeClass(key)" />
              </div>
              <label class="flex items-center gap-1.5 text-xs text-slate-500">
                Length
                <input type="number" :min="MIN_SLOT_MINUTES" :max="MAX_SLOT_MINUTES" :step="SLOT_STEP" inputmode="numeric"
                  :value="model.days[key].slot_minutes ?? ''" :placeholder="String(model.slot_minutes)"
                  @input="setDayLength(key, ($event.target as HTMLInputElement).value)"
                  :aria-label="`${DAY_NAMES[key]} appointment length in minutes`"
                  class="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
                min
              </label>
            </template>
            <span v-else class="text-xs text-slate-400">Closed. No online bookings.</span>
          </div>
          <p v-if="problems.days[key]" role="alert" class="text-xs text-red-500 mt-1.5">{{ problems.days[key] }}</p>
        </li>
      </ul>
      <p v-for="g in problems.general" :key="g" role="alert" class="text-xs text-red-500 mt-2">{{ g }}</p>
    </div>

    <!-- Days closed -->
    <div>
      <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Days closed</h3>
      <p class="text-xs text-slate-400 mb-2">Holidays, trainings or any date patients should not book. Past dates are removed when you save.</p>
      <div class="flex items-center gap-2 max-w-sm">
        <input type="date" v-model="newClosed" :min="today" aria-label="Date to close"
          class="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <button type="button" @click="addClosed" :disabled="!newClosed"
          class="text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition-colors">Add</button>
      </div>
      <ul v-if="model.closed_dates.length" class="flex flex-wrap gap-2 mt-3" aria-label="Closed dates">
        <li v-for="d in model.closed_dates" :key="d">
          <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-semibold pl-3 pr-1.5 py-1.5 rounded-full">
            {{ formatLongDate(d) }}
            <button type="button" :aria-label="`Remove ${formatLongDate(d)}`" @click="removeClosed(d)"
              class="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <span class="material-icons text-[14px]">close</span>
            </button>
          </span>
        </li>
      </ul>
    </div>

    <!-- What patients will see -->
    <div class="bg-slate-50 border border-gray-200 rounded-xl p-4">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wide mr-auto">What patients will see</h3>
        <div class="flex gap-1" role="tablist" aria-label="Preview a day">
          <button v-for="key in DAY_KEYS" :key="key" type="button" role="tab" :aria-selected="previewDay === key" @click="previewDay = key"
            :class="['text-[11px] font-bold px-2 py-1 rounded-lg transition-colors',
              previewDay === key ? 'bg-sky-500 text-white' : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-300']">
            {{ DAY_NAMES[key].slice(0, 3) }}
          </button>
        </div>
      </div>
      <p v-if="previewSlots.length" class="text-xs text-slate-500 mb-2" data-testid="preview-count">
        {{ DAY_NAMES[previewDay] }}: {{ previewSlots.length }} appointment time{{ previewSlots.length === 1 ? '' : 's' }}
      </p>
      <p v-else class="text-xs text-slate-500" data-testid="preview-count">{{ DAY_NAMES[previewDay] }}: closed</p>
      <ul v-if="previewSlots.length" class="flex flex-wrap gap-1.5" aria-label="Appointment times">
        <li v-for="s in previewSlots" :key="s.label" class="text-xs font-semibold text-slate-700 bg-white border border-gray-200 rounded-full px-3 py-1">{{ rangeLabel(s) }}</li>
      </ul>
    </div>

    <button type="button" @click="resetToDefault" class="text-xs font-semibold text-slate-400 hover:text-slate-600">Reset to the default hours</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatLongDate, manilaToday } from '@/utils/booking'
import {
  addClosedDate, DAY_KEYS, DAY_NAMES, defaultBookingHours, MAX_SLOT_MINUTES, MIN_SLOT_MINUTES, QUICK_LENGTHS, rangeLabel,
  removeClosedDate, SLOT_STEP, slotsFor, validateBookingHours,
  type BookingHours, type DayHours, type DayKey,
} from '@/utils/bookingHours'

const props = defineProps<{ modelValue: BookingHours }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: BookingHours): void }>()

const model = computed(() => props.modelValue)
const today = manilaToday()
const newClosed = ref('')
const problems = computed(() => validateBookingHours(model.value))

const timeClass = (key: DayKey) =>
  `border rounded-lg px-2.5 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 ${problems.value.days[key] ? 'border-red-300' : 'border-gray-200'}`

function emitChange(next: BookingHours) { emit('update:modelValue', next) }
const clone = (): BookingHours => JSON.parse(JSON.stringify(props.modelValue))

function update(key: DayKey, change: Partial<DayHours>) {
  const next = clone()
  next.days[key] = { ...next.days[key], ...change }
  emitChange(next)
}

function setLength(value: string) {
  const minutes = Number(value)
  if (value === '' || Number.isNaN(minutes)) return // typing in progress
  const next = clone()
  next.slot_minutes = minutes
  emitChange(next)
}

// An empty box means "same as the clinic-wide length"
function setDayLength(key: DayKey, value: string) {
  const next = clone()
  if (value === '') delete next.days[key].slot_minutes
  else if (!Number.isNaN(Number(value))) next.days[key].slot_minutes = Number(value)
  emitChange(next)
}

const hasBreak = (key: DayKey) => !!model.value.days[key].break_start || !!model.value.days[key].break_end
function toggleBreak(key: DayKey, on: boolean) {
  // A sensible starting point: the usual lunch hour, kept inside opening hours
  update(key, on ? { break_start: '12:00', break_end: '13:00' } : { break_start: null, break_end: null })
}

const firstOpen = computed(() => DAY_KEYS.find(k => model.value.days[k].open) ?? 'mon')
const firstOpenName = computed(() => DAY_NAMES[firstOpen.value])
function copyFromFirstOpen() {
  const next = clone()
  const source = next.days[firstOpen.value]
  for (const k of DAY_KEYS) if (next.days[k].open) next.days[k] = { ...source }
  emitChange(next)
}

function addClosed() {
  if (!newClosed.value) return
  const next = clone()
  next.closed_dates = addClosedDate(next.closed_dates, newClosed.value)
  newClosed.value = ''
  emitChange(next)
}
function removeClosed(date: string) {
  const next = clone()
  next.closed_dates = removeClosedDate(next.closed_dates, date)
  emitChange(next)
}

function resetToDefault() { emitChange(defaultBookingHours()) }

// Preview: the times for a typical week (the closed dates do not apply to a weekday preview)
const previewDay = ref<DayKey>(firstOpen.value)
const SAMPLE_MONDAY = '2026-10-19'
const previewSlots = computed(() => {
  const offset = DAY_KEYS.indexOf(previewDay.value)
  const d = new Date(`${SAMPLE_MONDAY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return slotsFor({ ...model.value, closed_dates: [] }, d.toISOString().slice(0, 10))
})
</script>
