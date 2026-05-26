<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
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

      <!-- Calendar + Appointments split -->
      <div class="flex gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white min-h-[520px]">

        <!-- Left: Full calendar -->
        <div class="w-[280px] shrink-0 bg-slate-50 border-r border-gray-200 p-4">

          <!-- Month nav -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-900">{{ monthLabel }}</span>
            <div class="flex gap-1">
              <button @click="changeMonth(-1)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-white transition-colors text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button @click="changeMonth(1)"
                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-white transition-colors text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Day labels -->
          <div class="grid grid-cols-7 mb-1">
            <div v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d"
              class="text-center text-[10px] font-semibold text-slate-400 py-1">{{ d }}</div>
          </div>

          <!-- Calendar cells -->
          <div class="grid grid-cols-7 gap-0.5">
            <!-- Previous month padding -->
            <div v-for="n in firstDayOfMonth" :key="'prev-' + n"
              class="aspect-square flex items-center justify-center text-xs text-slate-300">
              {{ prevMonthDays - firstDayOfMonth + n }}
            </div>

            <!-- Current month days -->
            <button v-for="day in daysInMonth" :key="day"
              @click="selectDate(day)"
              :class="[
                'aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors relative gap-0.5',
                cellKey(day) === selectedDate
                  ? 'bg-sky-500 text-white font-bold'
                  : isToday(day)
                    ? 'font-bold text-sky-600 hover:bg-white'
                    : 'text-slate-600 hover:bg-white',
              ]">
              <span>{{ day }}</span>
              <!-- dot for days with appointments -->
              <span v-if="datesWithAppointments.has(cellKey(day))"
                :class="[
                  'w-1 h-1 rounded-full',
                  cellKey(day) === selectedDate ? 'bg-white/70' : 'bg-sky-400'
                ]">
              </span>
            </button>
          </div>
        </div>

        <!-- Right: Appointment list -->
        <div class="flex-1 flex flex-col min-w-0">

          <!-- Date heading -->
          <div class="px-5 py-4 border-b border-gray-100">
            <p class="text-base font-bold text-slate-900">{{ selectedDateLabel }}</p>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ appointments.length === 0 ? 'No appointments' : appointments.length + ' appointment' + (appointments.length > 1 ? 's' : '') }}
            </p>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Empty -->
          <div v-else-if="appointments.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div class="text-3xl mb-3">📅</div>
            <p class="text-sm font-semibold text-slate-700">No appointments</p>
            <p class="text-xs text-slate-400 mt-1">No bookings scheduled for this day</p>
          </div>

          <!-- List -->
          <div v-else class="flex-1 overflow-y-auto p-4 space-y-2">
            <div v-for="appt in appointments" :key="appt.id"
              class="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-sky-200 transition-colors">
              <div class="text-center w-14 shrink-0">
                <p class="text-xs font-bold text-slate-700 leading-tight">{{ appt.time_slot ?? '—' }}</p>
              </div>
              <div class="w-px h-8 bg-gray-100 shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">
                  {{ (appt as any).patients?.full_name ?? 'Unknown' }}
                </p>
                <p class="text-xs text-slate-400">{{ (appt as any).patients?.contact_number }}</p>
              </div>
              <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusStyle(appt.status)]">
                {{ appt.status }}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { appointmentService } from '@/services/appointment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Appointment } from '@/types'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()
const appointments = ref<Appointment[]>([])
const loading = ref(true)

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const selectedDate = ref(today.toISOString().split('T')[0])

// All dates in current view that have appointments (for dots)
const datesWithAppointments = ref<Set<string>>(new Set())

const todayLabel = computed(() =>
  today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
)

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1)
    .toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
)

const selectedDateLabel = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
})

const firstDayOfMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).getDay()
)

const daysInMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
)

const prevMonthDays = computed(() =>
  new Date(viewYear.value, viewMonth.value, 0).getDate()
)

function cellKey(day: number) {
  return `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isToday(day: number) {
  return cellKey(day) === today.toISOString().split('T')[0]
}

function selectDate(day: number) {
  selectedDate.value = cellKey(day)
}

function changeMonth(dir: number) {
  viewMonth.value += dir
  if (viewMonth.value < 0) { viewMonth.value = 11; viewYear.value-- }
  if (viewMonth.value > 11) { viewMonth.value = 0; viewYear.value++ }
  loadMonthDots()
}

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

// Load which days this month have any appointments (for the dots)
async function loadMonthDots() {
  if (!authStore.clinic?.id) return
  const start = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-01`
  const end = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${daysInMonth.value}`
  const { data } = await appointmentService.getAll(authStore.clinic.id, { dateFrom: start, dateTo: end })
  const set = new Set<string>()
  if (data) {
    (data as any[]).forEach((a: any) => { if (a.appointment_date) set.add(a.appointment_date) })
  }
  datesWithAppointments.value = set
}

watch(selectedDate, loadAppointments)

onMounted(() => {
  loadAppointments()
  loadMonthDots()
  watchBranchChange(() => {
    loadAppointments()
    loadMonthDots()
  })
})
</script>