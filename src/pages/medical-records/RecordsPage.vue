<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Medical Records</h1>
        <p class="text-xs text-slate-400 mt-0.5">Search and filter across all patient records</p>
      </div>

      <!-- Filters -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">

        <!-- Keyword search -->
        <SearchBar
          v-model="filters.keyword"
          placeholder="Search patient, diagnosis, prescription, notes…"
        />

        <div class="grid grid-cols-2 gap-2">
          <!-- Date from -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">From</label>
            <input v-model="filters.dateFrom" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
          </div>
          <!-- Date to -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">To</label>
            <input v-model="filters.dateTo" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
          </div>
        </div>

        <!-- Doctor filter -->
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Doctor</label>
          <select v-model="filters.doctorId"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
            <option value="">All doctors</option>
            <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
          </select>
        </div>

        <!-- Filter actions -->
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs text-slate-400">
            <template v-if="!loading">
              {{ records.length }} record{{ records.length !== 1 ? 's' : '' }} found
            </template>
          </span>
          <div class="flex gap-2">
            <button v-if="hasActiveFilters" @click="clearFilters"
              class="text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-slate-50 transition-colors">
              Clear filters
            </button>
            <button @click="loadRecords" :disabled="loading"
              class="text-xs text-white font-bold px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors">
              {{ loading ? 'Searching…' : 'Search' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Active filter chips -->
      <div v-if="hasActiveFilters" class="flex flex-wrap gap-2">
        <span v-if="filters.keyword" class="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">
          "{{ filters.keyword }}"
          <button @click="filters.keyword = ''" class="hover:text-sky-900">✕</button>
        </span>
        <span v-if="filters.dateFrom || filters.dateTo" class="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">
          {{ filters.dateFrom || '…' }} → {{ filters.dateTo || '…' }}
          <button @click="filters.dateFrom = ''; filters.dateTo = ''" class="hover:text-sky-900">✕</button>
        </span>
        <span v-if="filters.doctorId" class="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">
          Dr. {{ doctorName(filters.doctorId) }}
          <button @click="filters.doctorId = ''" class="hover:text-sky-900">✕</button>
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="records.length === 0" class="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <div class="text-4xl mb-3">🗂️</div>
        <p class="text-sm font-semibold text-slate-700">
          {{ hasActiveFilters ? 'No records match your filters' : 'No records yet' }}
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {{ hasActiveFilters ? 'Try adjusting your search criteria' : 'Records appear here after consultations are completed' }}
        </p>
      </div>

      <!-- Records list -->
      <div v-else class="space-y-3">
        <RouterLink
          v-for="record in records"
          :key="record.id"
          :to="`/patients/${record.patient_id}`"
          class="block bg-white border border-gray-200 rounded-2xl p-4 space-y-3 hover:border-sky-200 hover:shadow-md transition-all">

          <!-- Patient + date row -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-bold text-sm shrink-0">
                {{ (record.patients?.full_name ?? 'U').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">{{ record.patients?.full_name ?? 'Unknown Patient' }}</p>
                <p class="text-xs text-slate-400">{{ record.patients?.contact_number }}</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-semibold text-slate-600">{{ formatDate(record.visit_date) }}</p>
              <p class="text-xs text-slate-400">Dr. {{ record.profiles?.full_name ?? '—' }}</p>
            </div>
          </div>

          <!-- Diagnosis -->
          <div v-if="record.diagnosis" class="bg-slate-50 rounded-xl px-3 py-2.5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Diagnosis</p>
            <p class="text-sm text-slate-700 line-clamp-2">{{ record.diagnosis }}</p>
          </div>

          <!-- Prescription -->
          <div v-if="record.prescription" class="bg-green-50 rounded-xl px-3 py-2.5">
            <p class="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-0.5">Prescription</p>
            <p class="text-sm text-green-800 line-clamp-2">{{ record.prescription }}</p>
          </div>

          <!-- Notes -->
          <div v-if="record.notes && !record.diagnosis && !record.prescription" class="bg-slate-50 rounded-xl px-3 py-2.5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Notes</p>
            <p class="text-sm text-slate-700 line-clamp-2">{{ record.notes }}</p>
          </div>

          <!-- View patient hint -->
          <div class="flex items-center justify-end gap-1 pt-0.5">
            <span class="text-[10px] text-slate-300 font-semibold uppercase tracking-wide">View patient profile</span>
            <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </RouterLink>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { medicalRecordService, type MedicalRecordWithDetails } from '@/services/medical-record.service'
import { appointmentService } from '@/services/appointment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/ui/SearchBar.vue'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const records = ref<MedicalRecordWithDetails[]>([])
const doctors = ref<{ id: string; full_name: string }[]>([])
const loading = ref(true)

const filters = ref({
  keyword: '',
  dateFrom: '',
  dateTo: '',
  doctorId: '',
})

const hasActiveFilters = computed(() =>
  !!(filters.value.keyword || filters.value.dateFrom || filters.value.dateTo || filters.value.doctorId)
)

function doctorName(id: string) {
  return doctors.value.find(d => d.id === id)?.full_name ?? id
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function clearFilters() {
  filters.value = { keyword: '', dateFrom: '', dateTo: '', doctorId: '' }
  loadRecords()
}

async function loadRecords() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await medicalRecordService.getAll(authStore.clinic.id, {
    keyword:   filters.value.keyword  || undefined,
    dateFrom:  filters.value.dateFrom || undefined,
    dateTo:    filters.value.dateTo   || undefined,
    doctorId:  filters.value.doctorId || undefined,
  })
  records.value = data ?? []
  loading.value = false
}

onMounted(async () => {
  if (authStore.clinic?.id) {
    doctors.value = await appointmentService.getDoctors(authStore.clinic.id)
  }
  await loadRecords()
  watchBranchChange(loadRecords)
})
</script>