<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center gap-3">
        <RouterLink to="/patients" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Add Patient</h1>
      </div>

      <PlanLimitAlert v-if="patientLimit" :limit-check="patientLimit" title="Patients" />

      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Full Name <span class="text-red-400">*</span>
          </label>
          <input v-model="form.full_name" type="text" placeholder="Juan Dela Cruz" required
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Contact Number <span class="text-red-400">*</span>
          </label>
          <input v-model="form.contact_number" type="tel" placeholder="09XXXXXXXXX" required
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          <p class="text-xs text-slate-400 mt-1">Used to identify the patient across visits.</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Birthdate</label>
            <input v-model="form.birthdate" type="date"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Gender</label>
            <select v-model="form.gender"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Address</label>
          <input v-model="form.address" type="text" placeholder="Barangay, City, Province"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div v-if="existingPatient" class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <p class="text-xs font-semibold text-amber-800">Patient already exists</p>
            <p class="text-xs text-amber-700">{{ existingPatient.full_name }} — {{ existingPatient.contact_number }}</p>
          </div>
        </div>

        <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-red-600">{{ errorMsg }}</p>
        </div>

        <button @click="handleSubmit" :disabled="saving || !form.full_name || !form.contact_number"
          class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
          {{ saving ? 'Saving…' : 'Save Patient' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import { patientService } from '@/services/patient.service'
import { planRestrictionService } from '@/services/planRestriction.service'
import AppLayout from '@/layouts/AppLayout.vue'
import PlanLimitAlert from '@/components/ui/PlanLimitAlert.vue'
import type { Patient, ClinicPlan } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { plan, isTrialActive } = useClinic()

const form = ref({ full_name: '', contact_number: '', birthdate: '', gender: '', address: '' })
const saving = ref(false)
const errorMsg = ref('')
const existingPatient = ref<Patient | null>(null)
const patientLimit = ref<Awaited<ReturnType<typeof planRestrictionService.checkPatientLimit>>['data']>(null)

const effectivePlan = computed((): ClinicPlan =>
  isTrialActive.value ? 'premium' : (plan.value as ClinicPlan)
)

async function loadPatientLimit() {
  if (!authStore.clinic?.id) return
  const result = await planRestrictionService.checkPatientLimit(authStore.clinic.id, effectivePlan.value)
  patientLimit.value = result.data
}

async function handleSubmit() {
  if (!authStore.clinic?.id) return
  saving.value = true
  errorMsg.value = ''
  existingPatient.value = null

  await loadPatientLimit()
  if (patientLimit.value && !patientLimit.value.allowed) {
    errorMsg.value = `Monthly new patient limit reached (${patientLimit.value.current}/${patientLimit.value.max}). Upgrade your plan to add more patients this month.`
    saving.value = false
    return
  }

  const { error } = await patientService.findOrCreate(authStore.clinic.id, {
    full_name: form.value.full_name,
    contact_number: form.value.contact_number,
    birthdate: form.value.birthdate || undefined,
    gender: form.value.gender || undefined,
    address: form.value.address || undefined,
  }, { plan: effectivePlan.value })

  saving.value = false

  if (error) { errorMsg.value = error; return }
  router.push('/patients')
}

onMounted(loadPatientLimit)
</script>