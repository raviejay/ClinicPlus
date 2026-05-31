<template>
  <div ref="rootRef" class="space-y-3">
    <label v-if="label" class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
      {{ label }} <span v-if="required" class="text-red-400">*</span>
    </label>

    <!-- Selected patient -->
    <div v-if="selected" class="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
      <div class="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm shrink-0">
        {{ selected.full_name.charAt(0).toUpperCase() }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-900 truncate">{{ selected.full_name }}</p>
        <p class="text-xs text-slate-500">{{ selected.contact_number }}</p>
      </div>
      <button
        type="button"
        class="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shrink-0"
        @click="clearSelection"
      >
        <span class="material-icons text-lg">close</span>
      </button>
    </div>

    <!-- Search -->
    <div v-else class="relative">
      <div class="bg-slate-50 border border-gray-200 rounded-xl focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
        <div class="relative flex items-center">
          <span class="material-icons absolute left-3 text-slate-400 text-xl">person_search</span>
          <input
            v-model="query"
            type="text"
            :placeholder="placeholder"
            class="w-full bg-transparent rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none"
            @focus="dropdownOpen = true"
          />
          <div v-if="searching" class="absolute right-3 w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>

      <!-- Results dropdown -->
      <div
        v-if="dropdownOpen && (query.trim().length >= 2 || results.length > 0)"
        class="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
      >
        <div v-if="searching" class="px-4 py-6 text-center text-xs text-slate-400">Searching…</div>

        <template v-else-if="results.length > 0">
          <p class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-50">
            {{ results.length }} patient{{ results.length !== 1 ? 's' : '' }} found
          </p>
          <button
            v-for="p in results"
            :key="p.id"
            type="button"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left border-b border-gray-50 last:border-0"
            @mousedown.prevent="selectPatient(p)"
          >
            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
              {{ p.full_name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-900 truncate">{{ p.full_name }}</p>
              <p class="text-xs text-slate-500">{{ p.contact_number }}</p>
            </div>
            <span class="material-icons text-sky-500 text-lg shrink-0">arrow_forward</span>
          </button>
        </template>

        <div v-else-if="query.trim().length >= 2" class="p-4 text-center">
          <p class="text-sm font-medium text-slate-700">No patient found</p>
          <p v-if="allowCreate" class="text-xs text-slate-400 mt-1">Add details below to register them</p>
        </div>

        <div v-else class="px-4 py-3 text-xs text-slate-400">
          Type at least 2 characters to search
        </div>
      </div>
    </div>

    <!-- New patient fields -->
    <div v-if="allowCreate && !selected && showNewFields" class="space-y-3 pt-1 border-t border-gray-100">
      <p class="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        New patient — complete their details
      </p>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Full name <span class="text-red-400">*</span></label>
        <input
          v-model="newName"
          type="text"
          placeholder="Juan Dela Cruz"
          class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Contact number <span class="text-red-400">*</span></label>
        <input
          v-model="newContact"
          type="tel"
          placeholder="09XXXXXXXXX"
          class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import type { Patient } from '@/types'

const props = withDefaults(defineProps<{
  modelValue: Patient | null
  label?: string
  placeholder?: string
  required?: boolean
  allowCreate?: boolean
}>(), {
  placeholder: 'Search by name or contact number…',
  required: false,
  allowCreate: true,
})

const emit = defineEmits<{
  'update:modelValue': [patient: Patient | null]
  'new-patient': [data: { full_name: string; contact_number: string }]
}>()

const authStore = useAuthStore()
const rootRef = ref<HTMLElement | null>(null)
const selected = ref<Patient | null>(props.modelValue)
const query = ref('')
const results = ref<Patient[]>([])
const searching = ref(false)
const dropdownOpen = ref(false)
const showNewFields = ref(false)
const newName = ref('')
const newContact = ref('')
let searchTimer: ReturnType<typeof setTimeout>

watch(() => props.modelValue, (v) => { selected.value = v })

watch(query, (q) => {
  clearTimeout(searchTimer)
  if (!q.trim()) {
    results.value = []
    showNewFields.value = false
    return
  }
  if (q.trim().length < 2) {
    results.value = []
    return
  }
  searchTimer = setTimeout(runSearch, 280)
})

watch([newName, newContact], () => {
  if (showNewFields.value && newName.value.trim() && newContact.value.trim()) {
    emit('new-patient', { full_name: newName.value.trim(), contact_number: newContact.value.trim() })
  }
})

async function runSearch() {
  if (!authStore.clinic?.id || query.value.trim().length < 2) return
  searching.value = true
  const { data } = await patientService.search(authStore.clinic.id, query.value.trim())
  results.value = data ?? []
  searching.value = false

  const exact = results.value.find(p => p.contact_number === query.value.trim())
  if (exact) {
    selectPatient(exact)
    return
  }

  if (props.allowCreate && results.value.length === 0) {
    showNewFields.value = true
    const digits = query.value.replace(/\D/g, '')
    if (digits.length >= 10) newContact.value = query.value.trim()
  } else {
    showNewFields.value = false
  }
}

function selectPatient(p: Patient) {
  selected.value = p
  emit('update:modelValue', p)
  query.value = ''
  results.value = []
  dropdownOpen.value = false
  showNewFields.value = false
  newName.value = ''
  newContact.value = ''
}

function clearSelection() {
  selected.value = null
  emit('update:modelValue', null)
  query.value = ''
  showNewFields.value = false
}

function onClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  clearTimeout(searchTimer)
})

defineExpose({
  getNewPatientData: () =>
    showNewFields.value && newName.value.trim() && newContact.value.trim()
      ? { full_name: newName.value.trim(), contact_number: newContact.value.trim() }
      : null,
})
</script>
