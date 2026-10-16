<template>
  <div :class="refined ? 'space-y-5' : 'space-y-4'">
    <div :class="refined ? 'border-y border-stone-300 py-5' : 'bg-white border border-gray-200 rounded-2xl shadow-sm p-5'">
      <h3 :class="refined ? 'text-[11px] font-semibold text-stone-500 uppercase tracking-[0.14em] mb-3' : 'text-xs font-bold text-slate-400 uppercase tracking-wider mb-3'">Your booking</h3>
      <dl class="space-y-2.5 text-sm">
        <div v-for="row in rows" :key="row.icon" class="flex items-center gap-3">
          <dt class="material-icons text-slate-300 text-[18px]">{{ row.icon }}</dt>
          <dd :class="row.empty ? 'text-slate-300' : row.strong ? 'font-semibold text-slate-800' : 'text-slate-700'">{{ row.text }}</dd>
        </div>
      </dl>
    </div>

    <!-- Notice (e.g. someone just took your time) -->
    <div v-if="ctx.notice" role="status" class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <span class="material-icons text-amber-500 text-[18px] mt-0.5 shrink-0">info</span>
      <p class="text-sm text-amber-800">{{ ctx.notice }}</p>
    </div>

    <div v-if="ctx.errorMsg" role="alert" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span class="material-icons text-red-500 text-[18px] mt-0.5 shrink-0">error_outline</span>
      <p class="text-sm text-red-600">{{ ctx.errorMsg }}</p>
    </div>

    <div v-if="action">
      <button type="button" @click="ctx.book()" :disabled="ctx.saving || !ctx.canSubmit"
        :style="ctx.canSubmit ? { background: ctx.primaryColor } : {}"
        :class="['w-full flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 transition-all text-sm active:scale-95 shadow-sm',
          refined ? 'rounded-full tracking-wide' : 'rounded-xl']">
        <span :class="['material-icons text-[18px]', ctx.saving ? 'animate-spin' : '']">{{ ctx.saving ? 'autorenew' : 'event_available' }}</span>
        {{ ctx.saving ? 'Confirming…' : 'Confirm Appointment' }}
      </button>
      <p v-if="!ctx.canSubmit && ctx.missing.length" class="text-xs text-slate-400 text-center mt-2">
        Still needed: {{ ctx.missing.join(', ') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatLongDate } from '@/utils/booking'
import { useBooking } from '../bookingContext'

const props = withDefaults(defineProps<{
  look?: 'classic' | 'refined'
  /** Include the Confirm button (the guided layout has its own bar) */
  action?: boolean
}>(), { look: 'classic', action: true })

const ctx = useBooking()
const refined = computed(() => props.look === 'refined')

const rows = computed(() => {
  const list: { icon: string; text: string; strong?: boolean; empty?: boolean }[] = [
    { icon: 'event', text: ctx.form.appointment_date ? formatLongDate(ctx.form.appointment_date) : '', strong: true },
    ctx.form.time_slot
      ? { icon: 'schedule', text: ctx.form.time_slot, strong: true }
      : { icon: 'schedule', text: 'Choose a time', empty: true },
  ]
  if (ctx.form.service_name) list.push({ icon: 'medical_services', text: ctx.form.service_name })
  const doctor = ctx.doctors.find(d => d.id === ctx.form.doctor_id)?.full_name
  if (doctor) list.push({ icon: 'stethoscope', text: doctor })
  return list
})
</script>
