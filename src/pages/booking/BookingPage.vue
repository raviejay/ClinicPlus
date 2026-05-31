<template>
  <div class="min-h-screen flex flex-col" :style="brandStyle">

    <!-- Loading -->
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

    <!-- Success -->
    <div v-else-if="submitted" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-black text-slate-900 mb-2">Booking confirmed!</h2>
        <p class="text-sm text-slate-500 mb-1"><strong>{{ form.full_name }}</strong></p>
        <p class="text-sm text-slate-500 mb-1">{{ formatDate(form.appointment_date) }} {{ form.time_slot ? '@ ' + form.time_slot : '' }}</p>
        <p v-if="form.service_name" class="text-xs text-slate-400 mb-4">{{ form.service_name }}</p>
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
      <!-- Header -->
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

          <!-- Patient info -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 class="text-sm font-bold text-slate-900">Your information</h2>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Full Name <span class="text-red-400">*</span>
              </label>
              <input v-model="form.full_name" type="text" placeholder="Juan Dela Cruz"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Contact Number <span class="text-red-400">*</span>
              </label>
              <input v-model="form.contact_number" type="tel" placeholder="09XXXXXXXXX"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              <p class="text-xs text-slate-400 mt-1">No account needed. Just your number.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input v-model="form.email" type="email" placeholder="patient@email.com"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              <p class="text-xs text-slate-400 mt-1">Optional — for booking confirmation.</p>
            </div>
          </div>

          <!-- Service selection -->
          <div class="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <h2 class="text-sm font-bold text-slate-900">What do you need?</h2>

            <!-- Category grid -->
            <div v-if="!selectedCategory" class="grid grid-cols-2 gap-2">
              <button v-for="cat in SERVICE_CATEGORIES" :key="cat.id"
                @click="selectedCategory = cat"
                class="flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 hover:border-opacity-80 text-left transition-all active:scale-95"
                :style="{ '--hover-color': primaryColor }">
                <span class="text-xl">{{ cat.icon }}</span>
                <span class="text-xs font-semibold text-slate-700">{{ cat.label }}</span>
              </button>
            </div>

            <!-- Services within category -->
            <div v-else>
              <button @click="selectedCategory = null; form.service_name = ''"
                class="flex items-center gap-1 text-xs font-semibold mb-3 transition-colors"
                :style="{ color: primaryColor }">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                {{ selectedCategory.icon }} {{ selectedCategory.label }}
              </button>
              <div class="grid grid-cols-1 gap-1.5">
                <button v-for="svc in selectedCategory.services" :key="svc"
                  @click="form.service_name = svc"
                  :class="[
                    'text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95',
                    form.service_name === svc ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-700'
                  ]"
                  :style="form.service_name === svc ? { background: primaryColor } : {}">
                  {{ svc }}
                </button>
              </div>
            </div>

            <!-- Selected badge -->
            <div v-if="form.service_name" class="flex items-center gap-2 rounded-lg px-3 py-2 border"
              :style="{ background: primaryColor + '12', borderColor: primaryColor + '40' }">
              <svg class="w-4 h-4 shrink-0" :style="{ color: primaryColor }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-xs font-semibold" :style="{ color: primaryColor }">{{ form.service_name }}</span>
              <button @click="form.service_name = ''; selectedCategory = null" class="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Schedule -->
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
              <label class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Preferred Time</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
                  :class="[
                    'py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95',
                    form.time_slot === slot ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-600'
                  ]"
                  :style="form.time_slot === slot ? { background: primaryColor } : {}">
                  {{ slot }}
                </button>
              </div>
            </div>

            <!-- Doctor — only shown for Pro/Premium clinics -->
            <div v-if="showDoctorSelect && doctors.length > 0">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Preferred Doctor</label>
              <select v-model="form.doctor_id"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white transition-all">
                <option value="">Any available doctor</option>
                <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Additional Notes</label>
              <textarea v-model="form.notes" rows="2" placeholder="Allergies, special concerns, or anything your clinic should know…"
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
            :style="{ background: canSubmit ? primaryColor : undefined }"
            class="w-full disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm active:scale-95">
            {{ saving ? 'Confirming…' : 'Confirm Booking' }}
          </button>

          <p class="text-center text-xs text-slate-300">
            Powered by <span class="font-semibold text-slate-400">ClinicGo</span>
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
import type { Clinic, ClinicSettings, ClinicBranding, ClinicPlan, ServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'

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
const clinicPlan = ref<ClinicPlan>('starter')
const isTrialActive = ref(false)

const selectedCategory = ref<ServiceCategory | null>(null)

const today = new Date().toISOString().split('T')[0]
const form = ref({
  full_name: '',
  contact_number: '',
  email: '',
  appointment_date: today,
  time_slot: '',
  doctor_id: '',
  service_name: '',
  service_category: '',
  notes: '',
})

const timeSlots = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM']

const primaryColor = computed(() => branding.value?.primary_color ?? '#0EA5E9')

// Doctor selection only for Pro/Premium plans (or active trial)
const showDoctorSelect = computed(() => {
  const effectivePlan = isTrialActive.value ? 'premium' : clinicPlan.value
  return (effectivePlan === 'pro' || effectivePlan === 'premium') &&
    settings.value?.booking_mode !== 'auto_assign'
})

const canSubmit = computed(() =>
  form.value.full_name.trim() &&
  form.value.contact_number.trim() &&
  form.value.appointment_date
)

const brandStyle = computed(() => ({
  background: primaryColor.value
    ? `linear-gradient(135deg, ${primaryColor.value}08 0%, #ffffff 60%)`
    : '#f8fafc',
}))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

function resetForm() {
  submitted.value = false
  selectedCategory.value = null
  form.value = {
    full_name: '', contact_number: '', email: '',
    appointment_date: today, time_slot: '',
    doctor_id: '', service_name: '', service_category: '', notes: '',
  }
}

function getEffectivePlan(c: Clinic): ClinicPlan {
  if (c.is_trial && c.trial_ends_at && new Date(c.trial_ends_at) > new Date()) return 'premium'
  return c.plan
}

async function handleBooking() {
  if (!clinic.value) return
  saving.value = true
  errorMsg.value = ''

  const { data: patient, error: patientError } = await patientService.findOrCreate(clinic.value.id, {
    full_name: form.value.full_name,
    contact_number: form.value.contact_number,
    email: form.value.email.trim() || undefined,
  }, { plan: getEffectivePlan(clinic.value) })

  if (patientError || !patient) {
    errorMsg.value = patientError ?? 'Could not register patient'
    saving.value = false
    return
  }

  const { error: apptError } = await appointmentService.createPublic({
    clinic_id: clinic.value.id,
    patient_id: patient.id,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: showDoctorSelect.value && form.value.doctor_id ? form.value.doctor_id : undefined,
    service_category: selectedCategory.value?.id || undefined,
    service_name: form.value.service_name || undefined,
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
    clinicPlan.value = data.plan
    isTrialActive.value = !!(data.is_trial && data.trial_ends_at && new Date(data.trial_ends_at) > new Date())

    // Only fetch doctors for Pro/Premium clinics
    const ep = getEffectivePlan(data)
    if ((ep === 'pro' || ep === 'premium') && settings.value?.booking_mode !== 'auto_assign') {
      doctors.value = await appointmentService.getDoctors(data.id)
    }
  }
  loading.value = false
})
</script>
