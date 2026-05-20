<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Add Medical Record</h1>
      </div>

      <!-- Patient info banner -->
      <div v-if="patient" class="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <div class="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
          {{ patient.full_name.charAt(0).toUpperCase() }}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ patient.full_name }}</p>
          <p class="text-xs text-slate-400">{{ patient.contact_number }}</p>
        </div>
      </div>

      <!-- No patient selected -->
      <div v-else class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Patient Contact Number <span class="text-red-400">*</span>
        </label>
        <div class="flex gap-2">
          <input v-model="contactNumber" type="tel" placeholder="09XXXXXXXXX"
            class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          <button @click="lookupPatient" :disabled="!contactNumber || lookingUp"
            class="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-semibold px-4 rounded-xl transition-colors">
            {{ lookingUp ? '…' : 'Find' }}
          </button>
        </div>
        <p v-if="patientError" class="text-xs text-red-500">{{ patientError }}</p>
      </div>

      <!-- Record form -->
      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Visit Date</label>
          <input v-model="form.visit_date" type="date"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Diagnosis
          </label>
          <textarea v-model="form.diagnosis" rows="3"
            placeholder="e.g. Upper respiratory tract infection, Hypertension Stage 1…"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all resize-none">
          </textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Prescription
          </label>
          <textarea v-model="form.prescription" rows="3"
            placeholder="e.g. Amoxicillin 500mg 3x daily for 7 days, Paracetamol 500mg PRN…"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all resize-none">
          </textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Notes
          </label>
          <textarea v-model="form.notes" rows="2"
            placeholder="Additional observations, follow-up instructions…"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all resize-none">
          </textarea>
        </div>

        <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-red-600">{{ errorMsg }}</p>
        </div>

        <button @click="handleSave" :disabled="saving || !patient"
          class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
          {{ saving ? 'Saving…' : 'Save Medical Record' }}
        </button>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import { medicalRecordService } from '@/services/medical-record.service'
import { queueService } from '@/services/queue.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const patient = ref<Patient | null>(null)
const contactNumber = ref('')
const lookingUp = ref(false)
const patientError = ref('')
const saving = ref(false)
const errorMsg = ref('')

const form = ref({
  visit_date: new Date().toISOString().split('T')[0],
  diagnosis: '',
  prescription: '',
  notes: '',
})

async function lookupPatient() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  lookingUp.value = true
  patientError.value = ''

  const { data } = await patientService.search(authStore.clinic.id, contactNumber.value)
  const exact = data?.find(p => p.contact_number === contactNumber.value)

  lookingUp.value = false
  if (exact) {
    patient.value = exact
  } else {
    patientError.value = 'Patient not found. Add them first from the Patients page.'
  }
}

async function handleSave() {
  if (!authStore.clinic?.id || !authStore.profile?.id || !patient.value) return
  saving.value = true
  errorMsg.value = ''

  const { error } = await medicalRecordService.create({
    clinic_id: authStore.clinic.id,
    patient_id: patient.value.id,
    doctor_id: authStore.profile.id,
    appointment_id: route.query.appointment as string || undefined,
    diagnosis: form.value.diagnosis || undefined,
    prescription: form.value.prescription || undefined,
    notes: form.value.notes || undefined,
    visit_date: form.value.visit_date,
  })

  // If came from queue, mark as done
  if (route.query.queue && authStore.clinic?.id) {
    await queueService.updateStatus(authStore.clinic.id, route.query.queue as string, 'done')
  }

  saving.value = false
  if (error) { errorMsg.value = error; return }

  router.push(`/patients/${patient.value.id}`)
}

onMounted(async () => {
  // Pre-load patient if passed via query param
  if (route.query.patient && authStore.clinic?.id) {
    const { data } = await patientService.getById(authStore.clinic.id, route.query.patient as string)
    if (data) patient.value = data
  }
})
</script>