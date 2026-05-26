<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Patients</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ totalCount }} total patients</p>
        </div>
        <RouterLink to="/patients/new"
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
        <input
          v-model="searchQuery"
          @input="handleSearch"
          type="text"
          placeholder="Search by name or contact number…"
          class="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="patients.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <p class="text-sm font-semibold text-slate-700">{{ searchQuery ? 'No patients found' : 'No patients yet' }}</p>
        <p class="text-xs text-slate-400 mt-1">{{ searchQuery ? 'Try a different search' : 'Patients appear here after booking or walk-in' }}</p>
      </div>

      <!-- Patient list -->
      <div v-else class="space-y-2">
        <RouterLink
          v-for="patient in patients"
          :key="patient.id"
          :to="`/patients/${patient.id}`"
          class="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-sky-200 hover:shadow-sm transition-all group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 font-bold text-sm shrink-0">
              {{ patient.full_name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                {{ patient.full_name }}
              </p>
              <p class="text-xs text-slate-400">{{ patient.contact_number }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span v-if="patient.gender" class="hidden sm:block text-xs text-slate-300 capitalize">{{ patient.gender }}</span>
            <svg class="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </RouterLink>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { patientService } from '@/services/patient.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient } from '@/types'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()
const patients = ref<Patient[]>([])
const totalCount = ref(0)
const loading = ref(true)
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout>

onMounted(async () => {
  await loadPatients()
  watchBranchChange(async () => {
    searchQuery.value = ''
    await loadPatients()
  })
})

async function loadPatients() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const [listRes, count] = await Promise.all([
    patientService.getAll(authStore.clinic.id),
    patientService.getCount(authStore.clinic.id),
  ])
  if (listRes.data) patients.value = listRes.data
  totalCount.value = count
  loading.value = false
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!authStore.clinic?.id) return
    loading.value = true
    if (searchQuery.value.trim()) {
      const { data } = await patientService.search(authStore.clinic.id, searchQuery.value.trim())
      patients.value = data ?? []
    } else {
      await loadPatients()
    }
    loading.value = false
  }, 300)
}
</script>