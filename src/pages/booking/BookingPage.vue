<template>
  <div class="min-h-screen flex flex-col" :style="brandStyle">

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Clinic not found -->
    <div v-else-if="!clinic" class="flex-1 flex items-center justify-center p-4 text-center">
      <div>
        <div class="text-4xl mb-4">🏥</div>
        <h1 class="text-lg font-bold text-slate-900 mb-2">Clinic not found</h1>
        <p class="text-sm text-slate-400">This booking page doesn't exist or has been disabled.</p>
      </div>
    </div>

    <!-- Success state -->
    <div v-else-if="submitted" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-black text-slate-900 mb-2">Booking confirmed!</h2>
        <p class="text-sm text-slate-500 mb-1">
          <strong>{{ form.full_name }}</strong>
        </p>
        <p class="text-sm text-slate-500 mb-4">
          {{ formatDate(form.appointment_date) }} {{ form.time_slot ? '@ ' + form.time_slot : '' }}
        </p>
        <p class="text-xs text-slate-400">
          We'll see you at <strong>{{ clinic.name }}</strong>. Please arrive a few minutes early.
        </p>
        <button @click="resetForm"
          class="mt-6 w-full border border-gray-200 text-slate-600 text-sm font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
          Book another
        </button>
      </div>
    </div>

    <!-- Booking form -->
    <template v-else>
      <!-- Clinic header -->
      <header class="bg-white border-b border-gray-100 px-4 py-4">
        <div class="max-w-md mx-auto flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
            :style="{ background: branding?.primary_color ?? '#0EA5E9' }">
            {{ clinic.name.charAt(0) }}
          </div>
          <div>
            <h1 class="font-black text-slate-900 text-base leading-tight">{{ clinic.name }}</h1>
            <p class="text-xs text-slate-400">Book an appointment</p>
          </div>
        </div>
      </header>

      <!-- Form -->
      <main class="flex-1 px-4 py-6">
        <div class="max-w-md mx-auto space-y-4">

          <div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 class="text-sm font-bold text-slate-900">Your information</h2>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Full Name <span class="text-red-400">*</span>
              </label>
              <input v-model="form.full_name" type="text" placeholder="Juan Dela Cruz"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all"
                :style="{ '--tw-ring-color': branding?.primary_color ?? '#0EA5E9' }"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Contact Number <span class="text-red-400">*</span>
              </label>
              <input v-model="form.contact_number" type="tel" placeholder="09XXXXXXXXX"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              <p class="text-xs text-slate-400 mt-1">No account needed. Just your number.</p>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 class="text-sm font-bold text-slate-900">Schedule</h2>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Preferred Date <span class="text-red-400">*</span>
              </label>
              <input v-model="form.appointment_date" type="date" :min="today"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Preferred Time</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
                  :class="[
                    'py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                    form.time_slot === slot ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-600 hover:border-gray-300'
                  ]"
                  :style="form.time_slot === slot ? { background: branding?.primary_color ?? '#0EA5E9' } : {}">
                  {{ slot }}
                </button>
              </div>
            </div>

            <!-- Doctor selection if enabled -->
            <div v-if="settings?.booking_mode !== 'auto_assign' && doctors.length > 0">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Preferred Doctor</label>
              <select v-model="form.doctor_id"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all">
                <option value="">Any available doctor</option>
                <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Reason for Visit</label>
              <textarea v-model="form.notes" rows="2" placeholder="e.g. Check-up, toothache, follow-up…"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all resize-none">
              </textarea>
            </div>
          </div>

          <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-xs text-red-600">{{ errorMsg }}</p>
          </div>

          <button @click="handleBooking" :disabled="saving || !canSubmit"
            :style="{ background: canSubmit ? (branding?.primary_color ?? '#0EA5E9') : undefined }"
            class="w-full disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm">
            {{ saving ? 'Confirming…' : 'Confirm Booking' }}
          </button>

          <p class="text-center text-xs text-slate-300">
            Powered by <span class="font-semibold text-slate-400">Cliniko</span>
          </p>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { clinicService } from '@/services/clinic.service'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import type { Clinic, ClinicSettings, ClinicBranding } from '@/types'

const route = useRoute()
const slug = route.params.slug as string

const loading = ref(true)
const saving = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

const clinic = ref<Clinic | null>(null)
const settings = ref<ClinicSettings | null>(null)
const branding = ref<ClinicBranding | null>(null)
const doctors = ref<{ id: string; full_name: string }[]>([])

const today = new Date().toISOString().split('T')[0]
const form = ref({
  full_name: '',
  contact_number: '',
  appointment_date: today,
  time_slot: '',
  doctor_id: '',
  notes: '',
})

const timeSlots = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM']

const canSubmit = computed(() =>
  form.value.full_name.trim() &&
  form.value.contact_number.trim() &&
  form.value.appointment_date
)

const brandStyle = computed(() => ({
  background: branding.value?.primary_color
    ? `linear-gradient(135deg, ${branding.value.primary_color}08 0%, #ffffff 60%)`
    : '#f8fafc',
}))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

function resetForm() {
  submitted.value = false
  form.value = { full_name: '', contact_number: '', appointment_date: today, time_slot: '', doctor_id: '', notes: '' }
}

async function handleBooking() {
  if (!clinic.value) return
  saving.value = true
  errorMsg.value = ''

  // Find or create patient
  const { data: patient, error: patientError } = await patientService.findOrCreate(clinic.value.id, {
    full_name: form.value.full_name,
    contact_number: form.value.contact_number,
  })

  if (patientError || !patient) {
    errorMsg.value = patientError ?? 'Could not register patient'
    saving.value = false
    return
  }

  // Create appointment
  const { error: apptError } = await appointmentService.createPublic({
    clinic_id: clinic.value.id,
    patient_id: patient.id,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: form.value.doctor_id || undefined,
    notes: form.value.notes || undefined,
  })

  saving.value = false

  if (apptError) {
    errorMsg.value = apptError
    return
  }

  submitted.value = true
}

onMounted(async () => {
  const { data } = await clinicService.getClinicBySlug(slug)
  if (data) {
    clinic.value = data
    settings.value = (data as any).clinic_settings ?? null
    branding.value = (data as any).clinic_branding ?? null

    if (data.id) {
      doctors.value = await appointmentService.getDoctors(data.id)
    }
  }
  loading.value = false
})
</script>