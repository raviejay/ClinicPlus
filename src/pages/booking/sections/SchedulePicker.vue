<template>
  <div :class="refined ? 'space-y-7' : 'space-y-5'">
    <div class="flex justify-end -mb-2">
      <button type="button" @click="ctx.refreshAvailability()" :disabled="ctx.availability.loading" aria-label="Refresh availability"
        class="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors">
        <span :class="['material-icons text-[15px]', ctx.availability.loading ? 'animate-spin' : '']">refresh</span>
        Live availability
      </button>
    </div>

    <MonthCalendar v-if="calendar === 'month'" v-model="ctx.form.appointment_date" :min="ctx.today" :primary-color="ctx.primaryColor" />
    <DateStrip v-else-if="calendar === 'strip'" v-model="ctx.form.appointment_date" :min="ctx.today" :primary-color="ctx.primaryColor" :look="look" />

    <!-- Doctor first: availability depends on who you see -->
    <div v-if="ctx.showDoctorSelect && ctx.doctors.length > 0">
      <label for="bk-doctor" :class="labelClass">Preferred Doctor</label>
      <div class="relative">
        <span v-if="!refined" class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">stethoscope</span>
        <select id="bk-doctor" v-model="ctx.form.doctor_id"
          :class="refined
            ? 'w-full py-2.5 pr-8 border-0 border-b border-stone-300 bg-transparent text-[15px] focus:outline-none focus:border-stone-800 appearance-none'
            : 'w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none'">
          <option value="">Any available doctor</option>
          <option v-for="doc in ctx.doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
        </select>
        <span class="absolute right-1 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
      </div>
    </div>

    <div>
      <p :class="[labelClass, 'mb-2']">
        Time <span class="text-red-400">*</span>
        <span v-if="ctx.form.time_slot" class="ml-1 normal-case tracking-normal font-bold" :style="{ color: ctx.primaryColor }">
          — {{ ctx.form.time_slot }}
        </span>
      </p>

      <div v-if="ctx.availability.error"
        class="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-xs text-slate-500">
        <span class="material-icons text-[16px] text-slate-400">cloud_off</span>
        Couldn't check live availability. Times shown may be out of date — we'll confirm when you book.
      </div>

      <TimeSlotPicker v-model:selected="ctx.form.time_slot" :booked="ctx.availability.booked"
        :date="ctx.form.appointment_date" :today="ctx.availability.today || ctx.today" :now-minutes="ctx.availability.minutes"
        :loading="ctx.availability.loading && !ctx.availability.loadedOnce" :primary-color="ctx.primaryColor"
        :look="look" @next-day="nextDay" />
    </div>

    <div v-if="notes">
      <label for="bk-notes" :class="labelClass">
        Additional Notes <span class="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
      </label>
      <textarea id="bk-notes" v-model="ctx.form.notes" rows="3" maxlength="1000"
        placeholder="Allergies, special concerns, or anything your clinic should know…"
        :class="refined
          ? 'w-full px-0 py-2.5 border-0 border-b border-stone-300 bg-transparent text-[15px] placeholder:text-stone-300 focus:outline-none focus:border-stone-800 resize-none'
          : 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none'"></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { addDays } from '@/utils/booking'
import { useBooking } from '../bookingContext'
import DateStrip from '../DateStrip.vue'
import MonthCalendar from '../MonthCalendar.vue'
import TimeSlotPicker from '../TimeSlotPicker.vue'

const props = withDefaults(defineProps<{
  look?: 'classic' | 'refined'
  calendar?: 'strip' | 'month' | 'none'
  /** Show the notes box (the guided layout asks for notes on the details step instead) */
  notes?: boolean
}>(), { look: 'classic', calendar: 'strip', notes: true })

const ctx = useBooking()
const refined = computed(() => props.look === 'refined')
const labelClass = computed(() =>
  refined.value
    ? 'block text-[11px] font-semibold text-stone-500 mb-1 uppercase tracking-[0.14em]'
    : 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider')

function nextDay() {
  ctx.form.appointment_date = addDays(ctx.form.appointment_date, 1)
}
</script>
