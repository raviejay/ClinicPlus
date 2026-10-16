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

      <!-- Filters and sorting -->
      <div class="flex items-center gap-2">
        <button type="button" @click="showFilters = !showFilters" :aria-expanded="showFilters"
          :class="['flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl border transition-colors',
            filterCount ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-200']">
          <span class="material-icons text-[18px]">tune</span>
          Filters
          <span v-if="filterCount" class="bg-sky-500 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{{ filterCount }}</span>
        </button>
        <label class="flex items-center gap-1.5 ml-auto text-xs text-slate-400">
          <span class="hidden sm:inline">Sort</span>
          <select v-model="filters.sort" aria-label="Sort patients"
            class="border border-gray-200 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400">
            <option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
      </div>

      <div v-if="showFilters" class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label for="pf-gender" class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
            <select id="pf-gender" v-model="filters.gender" :class="selectClass">
              <option value="all">Any</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unknown">Not recorded</option>
            </select>
          </div>
          <div>
            <label for="pf-age" class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
            <select id="pf-age" v-model="filters.age" :class="selectClass">
              <option v-for="a in AGE_GROUPS" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </div>
          <div>
            <label for="pf-added" class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Added</label>
            <select id="pf-added" v-model="filters.added" :class="selectClass">
              <option value="any">Any time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="year">This year</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer py-2.5">
              <input v-model="filters.incomplete" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400" />
              Incomplete profile
            </label>
          </div>
        </div>
        <p class="text-xs text-slate-400">"Incomplete" means a birthdate, gender or email is missing.</p>
      </div>

      <!-- What is switched on -->
      <div v-if="filterCount" class="flex flex-wrap items-center gap-2" aria-label="Active filters">
        <button v-for="chip in chips" :key="chip.key" type="button" @click="chip.clear()"
          class="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full hover:bg-sky-100">
          {{ chip.label }}<span class="material-icons text-[14px]">close</span>
        </button>
        <button type="button" @click="clearFilters" class="text-xs font-semibold text-slate-400 hover:text-slate-600 ml-1">Clear all</button>
      </div>

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

      <div v-else-if="visible.length === 0" class="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
        <span class="material-icons text-5xl text-slate-200">filter_alt_off</span>
        <p class="text-sm font-semibold text-slate-700 mt-3">No patients match these filters</p>
        <button type="button" @click="clearFilters" class="text-sm font-bold text-sky-600 hover:text-sky-700 mt-2">Clear filters</button>
      </div>

      <div v-else class="space-y-2">
        <RouterLink
          v-for="patient in shown"
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
          <div class="hidden sm:flex flex-col items-end gap-1 shrink-0">
            <div class="flex items-center gap-1.5">
              <span v-if="detail(patient).age" class="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg">{{ detail(patient).age }}</span>
              <span v-if="patient.gender" class="text-xs font-medium text-slate-500 capitalize bg-slate-50 px-2 py-0.5 rounded-lg">{{ patient.gender }}</span>
              <span v-if="detail(patient).incomplete" class="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg" title="Missing a birthdate, gender or email">Incomplete</span>
            </div>
            <span class="text-[11px] text-slate-400">Added {{ detail(patient).added }}</span>
          </div>
          <span class="material-icons text-slate-300 group-hover:text-sky-500 transition-colors shrink-0">chevron_right</span>
        </RouterLink>

        <button v-if="visible.length > shown.length" type="button" @click="limit += PAGE"
          class="w-full text-sm font-bold text-sky-600 hover:text-sky-700 bg-white border border-gray-200 rounded-2xl py-3 transition-colors">
          Show more ({{ visible.length - shown.length }} left)
        </button>
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
import { manilaToday } from '@/utils/booking'
import {
  activeFilterCount, addedOn, AGE_GROUPS, ageLabel, ageOn, DEFAULT_FILTERS, filterPatients, isIncomplete, sortPatients,
  type PatientFilters, type PatientSort,
} from '@/utils/patients'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import type { Patient } from '@/types'

const PAGE = 30
const SORTS: { value: PatientSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'age-asc', label: 'Youngest first' },
  { value: 'age-desc', label: 'Oldest age first' },
]
const selectClass =
  'w-full border border-gray-200 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400'

const authStore = useAuthStore()
const { isReadOnly } = useClinic()
const { watchBranchChange } = useBranchFilter()
const patients = ref<Patient[]>([])
const totalCount = ref(0)
const loading = ref(true)
const searching = ref(false)
const searchQuery = ref('')
const showFilters = ref(false)
const filters = ref<PatientFilters>({ ...DEFAULT_FILTERS })
const limit = ref(PAGE)
let searchTimer: ReturnType<typeof setTimeout>

const today = manilaToday()

// Filters and sorting apply on top of whatever the list holds (everyone, or the search results)
const visible = computed(() => sortPatients(filterPatients(patients.value, filters.value, today), filters.value.sort, today))
const shown = computed(() => visible.value.slice(0, limit.value))
const filterCount = computed(() => activeFilterCount(filters.value))

const GENDER_LABEL = { female: 'Female', male: 'Male', other: 'Other', unknown: 'Gender not recorded' } as const
const ADDED_LABEL = { '7d': 'Added in the last 7 days', '30d': 'Added in the last 30 days', year: 'Added this year' } as const
const chips = computed(() => {
  const f = filters.value
  const list: { key: string; label: string; clear: () => void }[] = []
  if (f.gender !== 'all') list.push({ key: 'gender', label: GENDER_LABEL[f.gender], clear: () => { f.gender = 'all' } })
  if (f.age !== 'all') list.push({ key: 'age', label: AGE_GROUPS.find(a => a.value === f.age)?.label ?? '', clear: () => { f.age = 'all' } })
  if (f.added !== 'any') list.push({ key: 'added', label: ADDED_LABEL[f.added], clear: () => { f.added = 'any' } })
  if (f.incomplete) list.push({ key: 'incomplete', label: 'Incomplete profile', clear: () => { f.incomplete = false } })
  return list
})

function clearFilters() {
  filters.value = { ...DEFAULT_FILTERS, sort: filters.value.sort }
}

function detail(p: Patient) {
  return {
    age: ageLabel(ageOn(p.birthdate, today), p.birthdate, today),
    incomplete: isIncomplete(p),
    added: new Date(`${addedOn(p)}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

const searchResultText = computed(() => {
  const searchingFor = searchQuery.value.trim()
  if (!searchingFor && !filterCount.value) return ''
  if (searching.value) return 'Searching…'
  const n = visible.value.length
  const of = filterCount.value ? ` of ${patients.value.length}` : ''
  return `${n}${of} result${n !== 1 ? 's' : ''}`
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
// Back to the first page whenever the list changes shape
watch([filters, patients], () => { limit.value = PAGE }, { deep: true })
</script>
