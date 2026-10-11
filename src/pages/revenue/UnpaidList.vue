<template>
  <section class="bg-white border border-amber-200 rounded-2xl overflow-hidden" aria-labelledby="unpaid-title">
    <div class="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
      <span class="material-icons text-amber-500 text-[20px]">receipt_long</span>
      <h2 id="unpaid-title" class="text-sm font-bold text-amber-900">To collect</h2>
      <span class="ml-1 text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{{ items.length }}</span>
      <span class="ml-auto text-[11px] text-amber-700">Completed visits with no payment — last 30 days</span>
    </div>
    <ul class="divide-y divide-gray-100">
      <li v-for="item in visible" :key="item.appointment_id" class="px-4 py-3 flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900 truncate">{{ item.patient_name }}</p>
          <p class="text-xs text-slate-400 truncate">
            {{ dayLabel(String(item.appointment_date).slice(0, 10)) }}<template v-if="item.time_slot"> · {{ item.time_slot }}</template>
            <template v-if="item.service_name"> · {{ item.service_name }}</template>
            <template v-if="item.doctor_name"> · Dr. {{ item.doctor_name }}</template>
          </p>
        </div>
        <button type="button" @click="$emit('no-charge', item.appointment_id)" :disabled="busyId === item.appointment_id"
          class="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          title="This visit is free — stop listing it">No charge</button>
        <RouterLink :to="{ path: '/revenue/record', query: { appointment: item.appointment_id, patient: item.patient_id } }"
          class="shrink-0 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
          Collect
        </RouterLink>
      </li>
    </ul>
    <button v-if="items.length > limit" type="button" @click="expanded = !expanded"
      class="w-full text-xs font-semibold text-sky-600 hover:bg-slate-50 py-2.5 border-t border-gray-100 transition-colors">
      {{ expanded ? 'Show fewer' : `Show all ${items.length}` }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UnpaidAppointment } from '@/services/payment.service'
import { dayLabel } from '@/utils/revenue'

const props = defineProps<{
  items: UnpaidAppointment[]
  /** Appointment currently being marked as no charge */
  busyId?: string | null
}>()
defineEmits<{ (e: 'no-charge', appointmentId: string): void }>()

const limit = 5
const expanded = ref(false)
const visible = computed(() => (expanded.value ? props.items : props.items.slice(0, limit)))
</script>
