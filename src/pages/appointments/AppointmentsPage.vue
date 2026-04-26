<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Schedule</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ todayLabel }}</p>
        </div>
        <RouterLink to="/appointments/new"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Book
        </RouterLink>
      </div>

      <!-- Date picker strip -->
      <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button v-for="d in dateStrip" :key="d.value" @click="selectedDate = d.value"
          :class="[
            'flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors',
            selectedDate === d.value
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
              : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-200'
          ]">
          <span class="text-xs opacity-75">{{ d.day }}</span>
          <span class="text-base font-black">{{ d.date }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="appointments.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <div class="text-3xl mb-3">📅</div>
        <p class="text-sm font-semibold text-slate-700">No appointments</p>
        <p class="text-xs text-slate-400 mt-1">No bookings for this date</p>
      </div>

      <!-- Appointment list -->
      <div v-else class="space-y-2">
        <div v-for="appt in appointments" :key="appt.id"
          class="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="text-center shrink-0 w-12">
              <p class="text-sm font-black text-slate-900">{{ appt.time_slot ?? '—' }}</p>
            </div>
            <div class="w-px h-8 bg-gray-100 shrink-0"></div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">
                {{ (appt as any).patients?.full_name ?? 'Unknown' }}
              </p>
              <p class="text-xs text-slate-400">{{ (appt as any).patients?.contact_number }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', statusStyle(appt.status)]">
              {{ appt.status }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { appointmentService } from '@/services/appointment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Appointment } from '@/types'

const authStore = useAuthStore()
const appointments = ref<Appointment[]>([])
const loading = ref(true)
const selectedDate = ref(new Date().toISOString().split('T')[0])

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
)

const dateStrip = computed(() => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      value: d.toISOString().split('T')[0],
      day: days[d.getDay()],
      date: d.getDate(),
    }
  })
})

function statusStyle(status: string) {
  return {
    pending:   'bg-amber-50 text-amber-600',
    confirmed: 'bg-sky-50 text-sky-600',
    completed: 'bg-green-50 text-green-600',
    cancelled: 'bg-red-50 text-red-400',
    no_show:   'bg-slate-100 text-slate-400',
  }[status] ?? 'bg-slate-100 text-slate-400'
}

async function loadAppointments() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await appointmentService.getAll(authStore.clinic.id, { date: selectedDate.value })
  appointments.value = (data as any) ?? []
  loading.value = false
}

watch(selectedDate, loadAppointments)
onMounted(loadAppointments)
</script>