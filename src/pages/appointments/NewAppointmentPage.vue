<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 pb-10">

      <!-- Top nav bar -->
      <div class="flex items-center gap-3 py-4 mb-2">
        <RouterLink to="/appointments"
          class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <span class="material-icons text-[18px]">arrow_back_ios</span>
          Back to Appointments
        </RouterLink>
      </div>

      <!-- Page Header -->
      <div class="flex items-center gap-4 mb-7">
        <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <span class="material-icons text-blue-500 text-[28px]">calendar_month</span>
        </div>
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">New Appointment</h1>
          <p class="text-sm text-slate-400 mt-0.5">Add a new patient and book an appointment</p>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        <!-- LEFT COLUMN -->
        <div class="space-y-5">

          <!-- Step 1: Patient Information -->
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 pt-5 pb-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span class="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h2 class="text-base font-bold text-slate-900">Patient Information</h2>
                  <p class="text-xs text-slate-400">Search by contact number to check if the patient already exists.</p>
                </div>
              </div>
            </div>

            <div class="px-6 py-5 space-y-5">
              <!-- Search input -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">
                  Search Patient <span class="text-red-400">*</span>
                </label>
                <div class="relative" v-click-outside="closeDropdown">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] z-10">search</span>
                  <input
                    v-model="searchQuery"
                    @input="onSearchInput"
                    @focus="showDropdown = true"
                    type="text"
                    placeholder="Type name or contact number…"
                    autocomplete="off"
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white placeholder-slate-300"
                  />
                  <!-- Spinner / clear -->
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span v-if="searching" class="material-icons text-slate-400 text-[18px] animate-spin">refresh</span>
                    <button v-else-if="searchQuery" @click="clearSearch"
                      class="material-icons text-slate-400 hover:text-slate-600 text-[18px] transition-colors">close</button>
                  </div>

                  <!-- Dropdown results -->
                  <div v-if="showDropdown && searchQuery.length >= 2"
                    class="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">

                    <!-- Loading -->
                    <div v-if="searching" class="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                      <span class="material-icons text-[16px] animate-spin">refresh</span>
                      Searching…
                    </div>

                    <!-- Results -->
                    <template v-else-if="searchResults.length > 0">
                      <button
                        v-for="p in searchResults" :key="p.id"
                        @click="selectPatient(p)"
                        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                          {{ p.full_name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-slate-800 truncate">{{ p.full_name }}</p>
                          <p class="text-xs text-slate-400">{{ p.contact_number }}</p>
                        </div>
                        <span class="material-icons text-slate-300 text-[16px]">arrow_forward_ios</span>
                      </button>
                    </template>

                    <!-- No results → new patient -->
                    <div v-else class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <span class="material-icons text-amber-500 text-[16px]">person_add</span>
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-semibold text-amber-800">No patient found</p>
                          <p class="text-xs text-amber-600">Register as new patient below</p>
                        </div>
                        <button @click="registerNewFromSearch"
                          class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0">
                          Register
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
                <p class="text-xs text-slate-400 mt-1.5">Search by full name or contact number (09XXXXXXXXX)</p>
              </div>

              <!-- Selected patient banner -->
              <div v-if="patient && !showDropdown"
                :class="['flex items-center gap-3 rounded-xl px-4 py-3.5',
                  isNewPatient ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200']">
                <div :class="['w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                  isNewPatient ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600']">
                  {{ (isNewPatient ? (newPatientName || '?') : patient.full_name).charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p :class="['text-sm font-bold truncate', isNewPatient ? 'text-amber-800' : 'text-green-800']">
                    {{ isNewPatient ? (newPatientName || searchQuery) : patient.full_name }}
                  </p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span :class="['material-icons text-[13px]', isNewPatient ? 'text-amber-400' : 'text-green-400']">
                      {{ isNewPatient ? 'person_add' : 'check_circle' }}
                    </span>
                    <p :class="['text-xs', isNewPatient ? 'text-amber-600' : 'text-green-600']">
                      {{ isNewPatient ? 'New patient' : 'Existing patient · ' + patient.contact_number }}
                    </p>
                  </div>
                </div>
                <button @click="clearSearch" class="text-slate-400 hover:text-slate-600 transition-colors">
                  <span class="material-icons text-[16px]">close</span>
                </button>
              </div>

              <!-- New patient fields -->
              <template v-if="showNewPatientFields">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name <span class="text-red-400">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">badge</span>
                    <input v-model="newPatientName" type="text" placeholder="Juan Dela Cruz"
                      class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white placeholder-slate-300" />
                  </div>
                  <p class="text-xs text-slate-400 mt-1.5">Enter the patient's complete name as it appears on valid ID.</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">
                    Contact Number <span class="text-red-400">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">phone</span>
                    <input v-model="contactNumber" type="tel" placeholder="09XXXXXXXXX"
                      class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white placeholder-slate-300" />
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Step 2: Service Selection -->
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 pt-5 pb-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span class="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h2 class="text-base font-bold text-slate-900">Service Selection</h2>
                  <p class="text-xs text-slate-400">Choose a service category first</p>
                </div>
              </div>
            </div>

            <div class="px-6 py-5">
              <!-- Category label -->
              <p class="text-sm font-semibold text-slate-700 mb-3">Select Category</p>

              <!-- Back button when category selected -->
              <button v-if="selectedCategory" @click="selectedCategory = null; form.service_name = ''"
                class="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors mb-3">
                <span class="material-icons text-[16px]">arrow_back</span>
                Back to categories
              </button>

              <!-- Category grid -->
              <div v-if="!selectedCategory" class="grid grid-cols-3 gap-3">
                <button v-for="cat in SERVICE_CATEGORIES" :key="cat.id"
                  @click="selectedCategory = cat"
                  class="group flex items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :style="{ backgroundColor: cat.bgColor || '#EFF6FF' }">
                    <span class="text-xl">{{ cat.icon }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-800 group-hover:text-blue-700 leading-tight">{{ cat.label }}</p>
                    <p class="text-xs text-slate-400 leading-tight mt-0.5">{{ cat.subtitle || '' }}</p>
                  </div>
                </button>
              </div>

              <!-- Services within category -->
              <div v-else class="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto">
                <button v-for="svc in selectedCategory.services" :key="svc"
                  @click="form.service_name = svc"
                  :class="[
                    'flex items-center gap-3 text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    form.service_name === svc
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                  ]">
                  <span :class="['material-icons text-[16px]', form.service_name === svc ? 'text-white' : 'text-slate-400']">
                    arrow_right
                  </span>
                  {{ svc }}
                </button>
              </div>

              <!-- Info hint -->
              <div v-if="!selectedCategory && !form.service_name"
                class="mt-4 flex items-center gap-2 text-xs text-slate-400 border border-dashed border-gray-200 rounded-xl px-4 py-3">
                <span class="material-icons text-[16px] text-blue-400">info</span>
                Select a category to view available services and proceed with booking.
              </div>

              <!-- Selected badge -->
              <div v-if="form.service_name"
                class="mt-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <span class="material-icons text-blue-500 text-[16px]">check_circle</span>
                <span class="text-sm font-semibold text-blue-700 flex-1 truncate">{{ form.service_name }}</span>
                <button @click="form.service_name = ''; selectedCategory = null"
                  class="text-blue-400 hover:text-blue-700 transition-colors">
                  <span class="material-icons text-[16px]">close</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Schedule & Summary -->
        <div class="lg:sticky lg:top-6 space-y-5">
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

            <!-- Step 3 header -->
            <div class="px-6 pt-5 pb-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span class="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h2 class="text-base font-bold text-slate-900">Schedule & Summary</h2>
                  <p class="text-xs text-slate-400">Choose date, time and confirm details</p>
                </div>
              </div>

              <!-- Select Date -->
              <div class="mb-5">
                <p class="text-sm font-semibold text-slate-700 mb-2">Select Date</p>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">event</span>
                  <input v-model="form.appointment_date" type="date" :min="today"
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              <!-- Available Time Slots -->
              <div class="mb-5">
                <p class="text-sm font-semibold text-slate-700 mb-2">Available Time Slots</p>
                <div class="grid grid-cols-3 gap-1.5">
                  <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
                    :class="[
                      'py-2.5 rounded-xl text-xs font-semibold border transition-all',
                      form.time_slot === slot
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    ]">
                    {{ slot }}
                  </button>
                </div>
              </div>

              <!-- Doctor (premium) -->
              <div v-if="canSelectDoctor" class="mb-5">
                <p class="text-sm font-semibold text-slate-700 mb-2">Provider</p>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">stethoscope</span>
                  <select v-model="form.doctor_id"
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white">
                    <option value="">Any available</option>
                    <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
                  </select>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-gray-100 mb-4"></div>

              <!-- Appointment Summary -->
              <div>
                <p class="text-sm font-bold text-slate-800 mb-3">Appointment Summary</p>
                <div class="space-y-0 divide-y divide-gray-100">

                  <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[17px] text-amber-400">person</span>
                      <span class="text-sm">Patient</span>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-bold text-slate-800 leading-tight">
                        {{ summaryPatientName || '—' }}
                      </p>
                      <p v-if="isNewPatient && patient" class="text-xs text-amber-500 font-medium">New Patient</p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[17px] text-green-400">phone</span>
                      <span class="text-sm">Contact</span>
                    </div>
                    <p class="text-sm font-bold text-slate-800">{{ contactNumber || '—' }}</p>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[17px] text-violet-400">sell</span>
                      <span class="text-sm">Service</span>
                    </div>
                    <p :class="['text-sm font-bold', form.service_name ? 'text-slate-800' : 'text-slate-300']">
                      {{ form.service_name || 'Not selected' }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[17px] text-blue-400">event</span>
                      <span class="text-sm">Date & Time</span>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-bold text-slate-800 leading-tight">{{ formattedDate }}</p>
                      <p v-if="form.time_slot" class="text-xs text-slate-500">{{ form.time_slot }}</p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[17px] text-blue-400">person_outline</span>
                      <span class="text-sm">Provider</span>
                    </div>
                    <p class="text-sm font-bold text-slate-800 text-right">
                      {{ selectedDoctorName || 'Any Available\nProvider' }}
                    </p>
                  </div>

                </div>
              </div>

              <!-- Notes -->
              <div class="mt-4">
                <p class="text-sm font-semibold text-slate-700 mb-2">Notes <span class="text-slate-400 font-normal text-xs">(optional)</span></p>
                <textarea v-model="form.notes" rows="2"
                  placeholder="Allergies, special instructions…"
                  class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white placeholder-slate-300">
                </textarea>
              </div>

              <!-- Error -->
              <div v-if="errorMsg" class="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                <span class="material-icons text-red-500 text-[16px] mt-0.5 shrink-0">error_outline</span>
                <p class="text-xs text-red-600">{{ errorMsg }}</p>
              </div>

              <!-- CTAs -->
              <div class="mt-5 space-y-2.5">
                <button @click="handleSubmit" :disabled="saving || !canSubmit"
                  class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-sm">
                  <span class="material-icons text-[18px]">{{ saving ? 'hourglass_empty' : 'event_available' }}</span>
                  {{ saving ? 'Booking…' : 'Create Appointment' }}
                </button>
                <button @click="resetForm"
                  class="w-full flex items-center justify-center gap-2 border border-gray-200 text-blue-600 hover:bg-gray-50 font-semibold py-3 rounded-xl transition-all text-sm">
                  <span class="material-icons text-[16px]">refresh</span>
                  Clear Form
                </button>
              </div>

              <!-- Security note -->
              <p class="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                <span class="material-icons text-[13px]">lock</span>
                Your information is secure and protected.
              </p>

            </div>
          </div>
        </div>

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
import { appointmentService } from '@/services/appointment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient, ClinicPlan, ServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { plan, isTrialActive, canUseFeature } = useClinic()

const effectivePlan = computed((): ClinicPlan =>
  isTrialActive.value ? 'premium' : (plan.value as ClinicPlan)
)

const canSelectDoctor = computed(() => canUseFeature('doctor_selection'))

const contactNumber = ref('')
const newPatientName = ref('')
const patient = ref<Patient | null>(null)
const isNewPatient = ref(false)
const showNewPatientFields = ref(false)
const lookingUp = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const doctors = ref<{ id: string; full_name: string }[]>([])

const selectedCategory = ref<ServiceCategory | null>(null)

const today = new Date().toISOString().split('T')[0]
const form = ref({
  appointment_date: today,
  time_slot: '',
  doctor_id: '',
  service_name: '',
  notes: '',
})

const timeSlots = [
  '9:00 AM','9:30 AM','10:00 AM',
  '10:30 AM','11:00 AM','11:30 AM',
  '1:00 PM','1:30 PM','2:00 PM',
  '2:30 PM','3:00 PM','3:30 PM',
  '4:00 PM','4:30 PM',
]

// Computed for summary display
const summaryPatientName = computed(() => {
  if (!patient.value) return ''
  if (isNewPatient.value) return newPatientName.value || contactNumber.value
  return patient.value.full_name
})

const formattedDate = computed(() => {
  if (!form.value.appointment_date) return '—'
  const d = new Date(form.value.appointment_date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
})

const selectedDoctorName = computed(() => {
  if (!form.value.doctor_id) return 'Any Available Provider'
  return doctors.value.find(d => d.id === form.value.doctor_id)?.full_name || 'Any Available Provider'
})

const canSubmit = computed(() =>
  form.value.appointment_date &&
  (patient.value || (showNewPatientFields.value && newPatientName.value)) &&
  contactNumber.value
)

function resetForm() {
  contactNumber.value = ''
  newPatientName.value = ''
  patient.value = null
  isNewPatient.value = false
  showNewPatientFields.value = false
  selectedCategory.value = null
  errorMsg.value = ''
  form.value = {
    appointment_date: today,
    time_slot: '',
    doctor_id: '',
    service_name: '',
    notes: '',
  }
}

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

  if (isNewPatient.value && newPatientName.value) {
    const { data, error } = await patientService.findOrCreate(authStore.clinic.id, {
      full_name: newPatientName.value,
      contact_number: contactNumber.value,
    }, { plan: effectivePlan.value })
    if (error || !data) { errorMsg.value = error ?? 'Could not create patient'; saving.value = false; return }
    patientId = data.id
  }

  if (!patientId) { errorMsg.value = 'Patient is required'; saving.value = false; return }

  const { error } = await appointmentService.create({
    clinic_id: authStore.clinic.id,
    patient_id: patientId,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: canSelectDoctor.value && form.value.doctor_id ? form.value.doctor_id : undefined,
    service_category: selectedCategory.value?.id || undefined,
    service_name: form.value.service_name || undefined,
    notes: form.value.notes || undefined,
  })

  saving.value = false
  if (error) { errorMsg.value = error; return }
  router.push('/appointments')
}

onMounted(async () => {
  if (authStore.clinic?.id && canSelectDoctor.value) {
    doctors.value = await appointmentService.getDoctors(authStore.clinic.id)
  }
})
</script>