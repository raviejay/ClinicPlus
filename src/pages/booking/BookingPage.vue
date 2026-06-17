<template>
  <div class="min-h-screen flex flex-col" :style="brandStyle">

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400 font-medium">Loading clinic…</p>
      </div>
    </div>

    <!-- Clinic not found -->
    <div v-else-if="!clinic" class="flex-1 flex items-center justify-center p-6 text-center">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full">
        <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="material-icons text-slate-400 text-3xl">local_hospital</span>
        </div>
        <h1 class="text-lg font-bold text-slate-900 mb-2">Clinic not found</h1>
        <p class="text-sm text-slate-400">This booking page doesn't exist or has been disabled.</p>
      </div>
    </div>

    <!-- Success screen -->
    <div v-else-if="submitted" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          :style="{ background: primaryColor + '18' }">
          <span class="material-icons text-3xl" :style="{ color: primaryColor }">check_circle</span>
        </div>
        <h2 class="text-2xl font-black text-slate-900 mb-1">All set!</h2>
        <p class="text-sm text-slate-500 mb-4">Your appointment has been confirmed.</p>
        <div class="bg-slate-50 border border-gray-200 rounded-xl px-4 py-4 text-left space-y-2.5 mb-6">
          <div class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">person</span>
            <span class="text-sm font-semibold text-slate-800">{{ form.full_name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">event</span>
            <span class="text-sm text-slate-700">{{ formatDate(form.appointment_date) }}</span>
          </div>
          <div v-if="form.time_slot" class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">schedule</span>
            <span class="text-sm text-slate-700">{{ form.time_slot }}</span>
          </div>
          <div v-if="form.service_name" class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">medical_services</span>
            <span class="text-sm text-slate-700">{{ form.service_name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">store</span>
            <span class="text-sm text-slate-700">{{ clinic.name }}</span>
          </div>
        </div>
        <p class="text-xs text-slate-400 mb-5">Please arrive a few minutes early. We look forward to seeing you!</p>
        <button @click="resetForm"
          class="w-full border border-gray-200 text-slate-600 text-sm font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
          <span class="material-icons text-[16px]">add_circle_outline</span>
          Book another appointment
        </button>
      </div>
    </div>

    <!-- =================== LAYOUT A: Classic (all plans) =================== -->
    <template v-else-if="activeLayout === 'layout_a'">
      <header class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div class="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <img v-if="branding?.logo_url" :src="branding.logo_url" alt="Logo"
            class="w-10 h-10 rounded-xl object-contain border border-gray-100 bg-white p-0.5 shadow-sm" />
          <div v-else class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
            :style="{ background: primaryColor }">
            {{ clinic.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h1 class="font-black text-slate-900 text-sm leading-tight">{{ clinic.name }}</h1>
            <p class="text-xs text-slate-400">Online Appointment Booking</p>
          </div>
        </div>
      </header>

      <!-- Progress indicator -->
      <div class="bg-white border-b border-gray-100">
        <div class="max-w-lg mx-auto px-4 py-2 flex items-center gap-1">
          <div v-for="(step, i) in steps" :key="i"
            :class="['flex items-center gap-1.5 text-xs font-semibold transition-colors',
              i <= currentStep ? 'text-sky-600' : 'text-slate-300']">
            <span :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
              i < currentStep ? 'bg-sky-500 border-sky-500 text-white' :
              i === currentStep ? 'border-sky-500 text-sky-500' : 'border-gray-200 text-slate-300']">
              <span v-if="i < currentStep" class="material-icons text-[11px]">check</span>
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="hidden sm:inline">{{ step }}</span>
            <span v-if="i < steps.length - 1" class="material-icons text-[14px] ml-1 text-slate-200">chevron_right</span>
          </div>
        </div>
      </div>

      <main class="flex-1 px-4 py-5">
        <div class="max-w-lg mx-auto space-y-4">
          <BookingForm
            :form="form"
            :primary-color="primaryColor"
            :selected-category="selectedCategory"
            :doctors="doctors"
            :show-doctor-select="showDoctorSelect"
            :time-slots="timeSlots"
            :today="today"
            :error-msg="errorMsg"
            :saving="saving"
            :can-submit="canSubmit"
            :categories="SERVICE_CATEGORIES"
            @update:selected-category="selectedCategory = $event"
            @book="handleBooking"
          />
          <p class="text-center text-xs text-slate-300 pb-4">
            Powered by <span class="font-semibold text-slate-400">ClinicGo</span>
          </p>
        </div>
      </main>
    </template>

    <!-- =================== LAYOUT B: Visual Cards (Pro+) =================== -->
    <template v-else-if="activeLayout === 'layout_b'">
      <header class="relative overflow-hidden"
        :style="{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }">
        <div class="absolute inset-0 opacity-10"
          style="background-image: radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px); background-size: 30px 30px;"></div>
        <div class="relative max-w-2xl mx-auto px-5 py-6 flex items-center gap-4">
          <img v-if="branding?.logo_url" :src="branding.logo_url" alt="Logo"
            class="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-lg shrink-0" />
          <div v-else class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
            {{ clinic!.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h1 class="text-lg font-black text-white leading-tight">{{ clinic!.name }}</h1>
            <p class="text-sm text-white/70 mt-0.5">Book your appointment online</p>
          </div>
          <div class="ml-auto hidden sm:flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <span class="material-icons text-white text-[16px]">verified</span>
            <span class="text-xs font-bold text-white">Instant Booking</span>
          </div>
        </div>
      </header>

      <div class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div class="max-w-2xl mx-auto px-4">
          <div class="flex">
            <div v-for="(step, i) in steps" :key="i"
              class="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all"
              :class="i < currentStep ? 'text-green-500 border-transparent' : i > currentStep ? 'text-slate-300 border-transparent' : ''"
              :style="i === currentStep ? { color: primaryColor, borderBottomColor: primaryColor } : {}">
              <span :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                i < currentStep ? 'bg-green-500 text-white' : i > currentStep ? 'bg-gray-100 text-slate-400' : 'text-white']"
                :style="i === currentStep ? { background: primaryColor } : {}">
                <span v-if="i < currentStep" class="material-icons text-[11px]">check</span>
                <span v-else>{{ i + 1 }}</span>
              </span>
              {{ step }}
            </div>
          </div>
        </div>
      </div>

      <main class="flex-1 px-4 py-6">
        <div class="max-w-2xl mx-auto space-y-4">
          <BookingForm
            :form="form"
            :primary-color="primaryColor"
            :selected-category="selectedCategory"
            :doctors="doctors"
            :show-doctor-select="showDoctorSelect"
            :time-slots="timeSlots"
            :today="today"
            :error-msg="errorMsg"
            :saving="saving"
            :can-submit="canSubmit"
            :categories="SERVICE_CATEGORIES"
            @update:selected-category="selectedCategory = $event"
            @book="handleBooking"
          />
          <p class="text-center text-xs text-slate-300 pb-4">Powered by <span class="font-semibold text-slate-400">ClinicGo</span></p>
        </div>
      </main>
    </template>

    <!-- =================== LAYOUT C: Clinic Showcase (Pro+) =================== -->
    <template v-else-if="activeLayout === 'layout_c'">
      <div class="min-h-screen flex flex-col lg:flex-row">
        <!-- Left panel -->
        <aside class="lg:w-80 xl:w-96 shrink-0 flex flex-col"
          :style="{ background: `linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }">
          <div class="p-6 flex flex-col gap-5 lg:sticky lg:top-0 lg:min-h-screen">
            <div class="flex items-center gap-3">
              <img v-if="branding?.logo_url" :src="branding.logo_url" alt="Logo"
                class="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-lg" />
              <div v-else class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl">
                {{ clinic!.name.charAt(0) }}
              </div>
              <div>
                <h1 class="text-base font-black text-white">{{ clinic!.name }}</h1>
                <p class="text-xs text-white/60">Clinic</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5">
                <span class="material-icons text-white/70 text-[18px]">location_on</span>
                <div>
                  <p class="text-xs font-bold text-white">Location</p>
                  <p class="text-xs text-white/60">Philippines</p>
                </div>
              </div>
              <div class="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5">
                <span class="material-icons text-white/70 text-[18px]">mail_outline</span>
                <div>
                  <p class="text-xs font-bold text-white">Email</p>
                  <p class="text-xs text-white/60">{{ clinic!.email ?? 'Not provided' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5">
                <span class="material-icons text-white/70 text-[18px]">schedule</span>
                <div>
                  <p class="text-xs font-bold text-white">Operating Hours</p>
                  <p class="text-xs text-white/60">8:00 AM – 5:00 PM</p>
                </div>
              </div>
            </div>
            <div class="flex-1 min-h-36 rounded-2xl overflow-hidden border border-white/20 bg-white/10 relative">
              <iframe
                :src="`https://maps.google.com/maps?q=${encodeURIComponent(clinic!.name + ' Philippines')}&output=embed&z=14`"
                class="w-full h-full absolute inset-0 opacity-90"
                frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                title="Clinic location map">
              </iframe>
              <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow">
                <span class="material-icons text-red-500 text-[14px]">place</span>
                <span class="text-[11px] font-bold text-slate-700">{{ clinic!.name }}</span>
              </div>
            </div>
            <p class="text-xs text-white/30 text-center">Powered by ClinicGo</p>
          </div>
        </aside>

        <!-- Right panel: booking form -->
        <main class="flex-1 bg-white px-4 py-6 lg:px-8 lg:py-8 overflow-y-auto">
          <div class="max-w-lg mx-auto space-y-4">
            <div class="mb-2">
              <h2 class="text-xl font-black text-slate-900">Book an Appointment</h2>
              <p class="text-sm text-slate-400 mt-0.5">Fill out the form and we'll confirm your slot.</p>
            </div>
            <BookingForm
              :form="form"
              :primary-color="primaryColor"
              :selected-category="selectedCategory"
              :doctors="doctors"
              :show-doctor-select="showDoctorSelect"
              :time-slots="timeSlots"
              :today="today"
              :error-msg="errorMsg"
              :saving="saving"
              :can-submit="canSubmit"
              :categories="SERVICE_CATEGORIES"
              @update:selected-category="selectedCategory = $event"
              @book="handleBooking"
            />
          </div>
        </main>
      </div>
    </template>

    <!-- =================== LAYOUT D: Custom / Premium =================== -->
    <template v-else-if="activeLayout === 'layout_d'">
      <div class="flex-1 flex items-center justify-center p-8 text-center">
        <div class="max-w-sm">
          <div class="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black shadow-lg"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">✦</div>
          <h1 class="text-xl font-black text-slate-900 mb-2">Custom Layout</h1>
          <p class="text-sm text-slate-500">Your custom booking page is being built by the ClinicGo team. In the meantime, patients can still book using the classic layout.</p>
          <button @click="branding!.layout = 'layout_a'"
            class="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow"
            :style="{ background: primaryColor }">Use Classic Layout</button>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { clinicService } from '@/services/clinic.service'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import { branchService } from '@/services/branch.service'
import type { Clinic, ClinicSettings, ClinicBranding, ClinicPlan, Branch, ServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'
import BookingForm from './BookingForm.vue'

const route = useRoute()
// /book/:clinicSlug/:branchSlug?
const clinicSlug = route.params.clinicSlug as string
const branchSlug = route.params.branchSlug as string | undefined

const loading = ref(true)
const saving = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

const clinic = ref<Clinic | null>(null)
const settings = ref<ClinicSettings | null>(null)
const branding = ref<ClinicBranding | null>(null)
// resolved branch — null means main clinic (no branch)
const branch = ref<Branch | null>(null)
const doctors = ref<{ id: string; full_name: string }[]>([])
const clinicPlan = ref<ClinicPlan>('starter')
const isTrialActive = ref(false)

const selectedCategory = ref<ServiceCategory | null>(null)

const steps = ['Your Info', 'Service', 'Schedule']
const currentStep = computed(() => {
  if (!form.value.full_name || !form.value.contact_number) return 0
  if (!form.value.service_name) return 1
  return 2
})

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

const timeSlots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

const primaryColor = computed(() => branding.value?.primary_color ?? '#0EA5E9')
const secondaryColor = computed(() => branding.value?.secondary_color ?? '#0369A1')

const effectivePlan = computed((): ClinicPlan => {
  if (!clinic.value) return 'starter'
  return isTrialActive.value ? 'premium' : clinicPlan.value
})

const activeLayout = computed(() => {
  const layout = branding.value?.layout ?? 'layout_a'
  const plan = effectivePlan.value
  if (layout === 'layout_d' && plan !== 'premium') return 'layout_a'
  if ((layout === 'layout_b' || layout === 'layout_c') && plan === 'starter') return 'layout_a'
  return layout
})

const showDoctorSelect = computed(() =>
  (effectivePlan.value === 'pro' || effectivePlan.value === 'premium') &&
  settings.value?.booking_mode !== 'auto_assign'
)

const canSubmit = computed(() =>
  Boolean(form.value.full_name.trim() && form.value.contact_number.trim() && form.value.appointment_date)
)

const brandStyle = computed(() => ({
  background: primaryColor.value
    ? `linear-gradient(150deg, ${primaryColor.value}10 0%, #f8fafc 50%)`
    : '#f8fafc',
}))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
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

  // Pass branch_id so the patient is linked to the correct branch
  const { data: patient, error: patientError } = await patientService.findOrCreate(
    clinic.value.id,
    {
      full_name: form.value.full_name,
      contact_number: form.value.contact_number,
      email: form.value.email.trim() || undefined,
      branch_id: branch.value?.id ?? undefined,
    },
    { plan: getEffectivePlan(clinic.value) }
  )

  if (patientError || !patient) {
    errorMsg.value = patientError ?? 'Could not register patient'
    saving.value = false
    return
  }

  // Pass branch_id so the appointment lands in the correct branch
  const { error: apptError } = await appointmentService.createPublic({
    clinic_id: clinic.value.id,
    branch_id: branch.value?.id ?? undefined,
    patient_id: patient.id,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: showDoctorSelect.value && form.value.doctor_id ? form.value.doctor_id : undefined,
    service_category: selectedCategory.value?.id || undefined,
    service_name: form.value.service_name || undefined,
    notes: form.value.notes || undefined,
  })

  saving.value = false
  if (apptError) { errorMsg.value = apptError; return }
  submitted.value = true
}

onMounted(async () => {
  // Use clinicSlug (not old "slug") to load the clinic
  const { data } = await clinicService.getClinicBySlug(clinicSlug)
  if (data) {
    clinic.value = data
    settings.value = (data as any).clinic_settings ?? null
    branding.value = (data as any).clinic_branding ?? null
    clinicPlan.value = data.plan
    isTrialActive.value = !!(data.is_trial && data.trial_ends_at && new Date(data.trial_ends_at) > new Date())

    // If a branch slug was in the URL, resolve it to a real branch row
    if (branchSlug) {
      const { data: branchData } = await branchService.getBySlug(data.id, branchSlug)
      branch.value = branchData ?? null
    }

    const ep = getEffectivePlan(data)
    if ((ep === 'pro' || ep === 'premium') && settings.value?.booking_mode !== 'auto_assign') {
      doctors.value = await appointmentService.getDoctors(data.id)
    }
  }
  loading.value = false
})
</script>