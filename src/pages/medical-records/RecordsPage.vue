<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Medical Records</h1>
          <p class="text-xs text-slate-400 mt-0.5">Recent consultations</p>
        </div>
        <RouterLink to="/medical-records/new"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add
        </RouterLink>
      </div>

      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="search" type="text" placeholder="Search by patient name…"
          class="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white" />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <div class="text-3xl mb-3">📋</div>
        <p class="text-sm font-semibold text-slate-700">No records found</p>
        <p class="text-xs text-slate-400 mt-1">Records appear here after consultations</p>
      </div>

      <!-- Records list -->
      <div v-else class="space-y-3">
        <div v-for="record in filtered" :key="record.id"
          class="bg-white border border-gray-200 rounded-xl p-4 space-y-2">

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-bold text-sm shrink-0">
                {{ (record.patients?.full_name ?? 'U').charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ record.patients?.full_name }}</p>
                <p class="text-xs text-slate-400">{{ record.patients?.contact_number }}</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-semibold text-slate-600">{{ formatDate(record.visit_date) }}</p>
              <p class="text-xs text-slate-400">Dr. {{ record.profiles?.full_name ?? 'Unknown' }}</p>
            </div>
          </div>

          <div v-if="record.diagnosis" class="bg-slate-50 rounded-lg px-3 py-2">
            <p class="text-xs font-semibold text-slate-400 mb-0.5">Diagnosis</p>
            <p class="text-sm text-slate-700 line-clamp-2">{{ record.diagnosis }}</p>
          </div>

          <div v-if="record.prescription" class="bg-green-50 rounded-lg px-3 py-2">
            <p class="text-xs font-semibold text-green-600 mb-0.5">💊 Prescription</p>
            <p class="text-sm text-green-800 line-clamp-2">{{ record.prescription }}</p>
          </div>

        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { medicalRecordService, type MedicalRecordWithDetails } from '@/services/medical-record.service'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()
const records = ref<MedicalRecordWithDetails[]>([])
const loading = ref(true)
const search = ref('')

const filtered = computed(() => {
  if (!search.value.trim()) return records.value
  return records.value.filter(r =>
    r.patients?.full_name.toLowerCase().includes(search.value.toLowerCase())
  )
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadRecords() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await medicalRecordService.getAll(authStore.clinic.id)
  records.value = data ?? []
  loading.value = false
}

onMounted(async () => {
  await loadRecords()
  watchBranchChange(async () => {
    await loadRecords()
  })
})
</script>