<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center gap-3">
        <RouterLink to="/appointments" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Book Appointment</h1>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        <!-- Contact number (find or create patient) -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Patient Contact Number <span class="text-red-400">*</span>
          </label>
          <div class="flex gap-2">
            <input v-model="contactNumber" type="tel" placeholder="09XXXXXXXXX"
              class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            <button @click="lookupPatient" :disabled="!contactNumber || lookingUp"
              class="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-semibold px-4 py-3 rounded-xl transition-colors">
              {{ lookingUp ? '…' : 'Find' }}
            </button>
          </div>
        </div>

        <!-- Patient found/new -->
        <div v-if="patient" class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
            {{ patient.full_name.charAt(0) }}
          </div>
          <div>
            <p class="text-sm font-semibold text-green-800">{{ patient.full_name }}</p>
            <p class="text-xs text-green-600">{{ isNewPatient ? 'New patient — will be registered' : 'Existing patient found' }}</p>
          </div>
        </div>

        <!-- New patient name (if not found) -->
        <div v-if="showNewPatientFields">
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Patient Full Name <span class="text-red-400">*</span>
          </label>
          <input v-model="newPatientName" type="text" placeholder="Juan Dela Cruz"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <!-- Date -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Appointment Date <span class="text-red-400">*</span>
          </label>
          <input v-model="form.appointment_date" type="date" :min="today"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <!-- Time slot -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Time Slot</label>
          <div class="grid grid-cols-4 gap-2">
            <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
              :class="[
                'py-2 rounded-lg text-xs font-semibold border transition-colors',
                form.time_slot === slot
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'
              ]">
              {{ slot }}
            </button>
          </div>
        </div>

        <!-- Doctor (if doctor_selection mode) -->
        <div v-if="showDoctorSelect">
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Doctor</label>
          <select v-model="form.doctor_id"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
            <option value="">Any available doctor</option>
            <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
          </select>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Notes</label>
          <textarea v-model="form.notes" rows="2" placeholder="Reason for visit, concerns…"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all resize-none">
          </textarea>
        </div>

        <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-red-600">{{ errorMsg }}</p>
        </div>

        <button @click="handleSubmit" :disabled="saving || !canSubmit"
          class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
          {{ saving ? 'Booking…' : 'Confirm Appointment' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const contactNumber = ref('')
const newPatientName = ref('')
const patient = ref<Patient | null>(null)
const isNewPatient = ref(false)
const showNewPatientFields = ref(false)
const lookingUp = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const doctors = ref<{ id: string; full_name: string }[]>([])

const today = new Date().toISOString().split('T')[0]
const form = ref({ appointment_date: today, time_slot: '', doctor_id: '', notes: '' })

const timeSlots = ['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM']

const showDoctorSelect = computed(() =>
  authStore.clinicSettings?.booking_mode !== 'auto_assign'
)

const canSubmit = computed(() =>
  form.value.appointment_date &&
  (patient.value || (showNewPatientFields.value && newPatientName.value)) &&
  contactNumber.value
)

async function lookupPatient() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  lookingUp.value = true
  patient.value = null
  showNewPatientFields.value = false

  const { data } = await patientService.findOrCreate(authStore.clinic.id, {
    full_name: '_temp_',
    contact_number: contactNumber.value,
  })

  lookingUp.value = false

  if (data) {
    if (data.full_name === '_temp_') {
      // New — delete temp and show name field
      isNewPatient.value = true
      showNewPatientFields.value = true
      patient.value = data
    } else {
      isNewPatient.value = false
      patient.value = data
    }
  }
}

async function handleSubmit() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  saving.value = true
  errorMsg.value = ''

  let patientId = patient.value?.id

  // Create/update patient if new
  if (isNewPatient.value && newPatientName.value) {
    const { data, error } = await patientService.findOrCreate(authStore.clinic.id, {
      full_name: newPatientName.value,
      contact_number: contactNumber.value,
    })
    if (error || !data) { errorMsg.value = error ?? 'Could not create patient'; saving.value = false; return }
    patientId = data.id
  }

  if (!patientId) { errorMsg.value = 'Patient is required'; saving.value = false; return }

  const { error } = await appointmentService.create({
    clinic_id: authStore.clinic.id,
    patient_id: patientId,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: form.value.doctor_id || undefined,
    notes: form.value.notes || undefined,
  })

  saving.value = false
  if (error) { errorMsg.value = error; return }
  router.push('/appointments')
}

onMounted(async () => {
  if (authStore.clinic?.id) {
    doctors.value = await appointmentService.getDoctors(authStore.clinic.id)
  }
})
</script>