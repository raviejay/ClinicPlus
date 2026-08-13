<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Patients</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ totalCount }} total patients</p>
        </div>
        <RouterLink v-if="!isReadOnly" to="/patients/new"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <span class="material-icons text-sm">person_add</span>
          Add
        </RouterLink>
        <span v-else
          class="flex items-center gap-1.5 bg-slate-100 text-slate-400 text-sm font-bold px-4 py-2 rounded-xl cursor-not-allowed" title="Read-only — choose a plan to add patients">
          <span class="material-icons text-sm">lock</span>
          Add
        </span>
      </div>

      <SearchBar
        v-model="searchQuery"
        placeholder="Search by name or contact number…"
        :loading="searching"
        :result-text="searchResultText"
      />

      <div v-if="loading && !searchQuery" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="patients.length === 0" class="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <span class="material-icons text-5xl text-slate-200">person_search</span>
        <p class="text-sm font-semibold text-slate-700 mt-3">{{ searchQuery ? 'No patients found' : 'No patients yet' }}</p>
        <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {{ searchQuery ? 'Try a different name or phone number' : 'Patients appear here after booking or walk-in' }}
        </p>
        <RouterLink v-if="!searchQuery" to="/patients/new"
          class="inline-flex items-center gap-1 mt-4 text-sm font-bold text-sky-600 hover:text-sky-700">
          <span class="material-icons text-sm">add</span>
          Add first patient
        </RouterLink>
      </div>

      <div v-else class="space-y-2">
        <RouterLink
          v-for="patient in patients"
          :key="patient.id"
          :to="`/patients/${patient.id}`"
          class="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-sky-200 hover:shadow-md transition-all group shadow-sm">
          <div class="w-11 h-11 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm shrink-0">
            {{ patient.full_name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
              {{ patient.full_name }}
            </p>
            <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <span class="material-icons text-sm text-slate-300">phone</span>
              {{ patient.contact_number }}
            </p>
          </div>
          <span v-if="patient.gender" class="hidden sm:inline text-xs font-medium text-slate-400 capitalize bg-slate-50 px-2 py-1 rounded-lg">
            {{ patient.gender }}
          </span>
          <span class="material-icons text-slate-300 group-hover:text-sky-500 transition-colors shrink-0">chevron_right</span>
        </RouterLink>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { patientService } from '@/services/patient.service'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import type { Patient } from '@/types'

const authStore = useAuthStore()
const { isReadOnly } = useClinic()
const { watchBranchChange } = useBranchFilter()
const patients = ref<Patient[]>([])
const totalCount = ref(0)
const loading = ref(true)
const searching = ref(false)
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const searchResultText = computed(() => {
  if (!searchQuery.value.trim()) return ''
  if (searching.value) return 'Searching…'
  return `${patients.value.length} result${patients.value.length !== 1 ? 's' : ''}`
})

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
    const q = searchQuery.value.trim()
    if (!q) {
      searching.value = false
      await loadPatients()
      return
    }
    searching.value = true
    const { data } = await patientService.search(authStore.clinic.id, q)
    patients.value = data ?? []
    searching.value = false
  }, 300)
}

watch(searchQuery, handleSearch)
</script>