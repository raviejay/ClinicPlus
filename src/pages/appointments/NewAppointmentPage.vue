<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto">

      <!-- Page header -->
      <div class="flex items-center gap-3 mb-6">
        <RouterLink to="/appointments"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-slate-400 hover:text-slate-700 hover:border-gray-300 shadow-sm transition-all">
          <span class="material-icons text-[18px]">arrow_back</span>
        </RouterLink>
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
            <span class="material-icons text-sky-500 text-[22px]">calendar_month</span>
          </div>
          <div>
            <h1 class="text-xl font-black tracking-tight text-slate-900">New Appointment</h1>
            <p class="text-xs text-slate-400 mt-0.5">Add a new patient and book an appointment</p>
          </div>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">

        <!-- LEFT COLUMN -->
        <div class="space-y-5">

          <!-- ① Patient Information -->
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                <span class="text-white text-xs font-black">1</span>
              </div>
              <div>
                <h2 class="text-sm font-bold text-slate-800">Patient Information</h2>
                <p class="text-xs text-slate-400">Search by contact number to check if the patient already exists.</p>
              </div>
            </div>

            <div class="p-5 space-y-4">
              <!-- Contact number with live search -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Number <span class="text-red-400">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">phone</span>
                  <input
                    v-model="contactNumber"
                    @input="onContactInput"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    class="w-full pl-10 pr-32 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  />
                  <button
                    @click="searchPatient"
                    :disabled="!contactNumber || searching"
                    class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span class="material-icons text-[14px]">{{ searching ? 'hourglass_empty' : 'search' }}</span>
                    {{ searching ? 'Searching…' : 'Search Patient' }}
                  </button>
                </div>

                <!-- Live search dropdown -->
                <div v-if="searchResults.length > 0 && !selectedPatient"
                  class="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 relative">
                  <div class="px-3 py-2 bg-slate-50 border-b border-gray-100">
                    <p class="text-xs text-slate-500 font-medium">{{ searchResults.length }} result(s) found</p>
                  </div>
                  <div class="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    <button
                      v-for="p in searchResults"
                      :key="p.id"
                      @click="selectExistingPatient(p)"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 text-left transition-colors"
                    >
                      <div class="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                        <span class="text-sky-600 text-xs font-bold">{{ p.full_name.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-800 truncate">{{ p.full_name }}</p>
                        <p class="text-xs text-slate-400">{{ p.contact_number }}</p>
                      </div>
                      <span class="material-icons text-slate-300 text-[16px] ml-auto shrink-0">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- No record found notice (new patient) -->
              <div v-if="showNewPatientNotice && !selectedPatient"
                class="flex items-center gap-3 rounded-xl px-4 py-3 bg-amber-50 border border-amber-200">
                <div class="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span class="material-icons text-amber-500 text-[18px]">person_add</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-amber-800">New patient detected</p>
                  <p class="text-xs text-amber-600">No existing record found for this contact number.</p>
                </div>
              </div>

              <!-- Existing patient selected -->
              <div v-if="selectedPatient && !isNewPatient"
                class="flex items-center gap-3 rounded-xl px-4 py-3 bg-green-50 border border-green-200">
                <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-sm shrink-0 text-green-600">
                  {{ selectedPatient.full_name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-green-800 truncate">{{ selectedPatient.full_name }}</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span class="material-icons text-green-400 text-[13px]">check_circle</span>
                    <p class="text-xs text-green-600">Existing patient found</p>
                  </div>
                </div>
                <button @click="clearPatient" class="text-green-400 hover:text-green-600 transition-colors">
                  <span class="material-icons text-[18px]">close</span>
                </button>
              </div>

              <!-- Full Name field for new patient -->
              <div v-if="showNewPatientNotice && !selectedPatient">
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span class="text-red-400">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">person</span>
                  <input
                    v-model="newPatientName"
                    type="text"
                    placeholder="Enter full name"
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  />
                </div>
                <p class="text-xs text-slate-400 mt-1">Enter the patient's complete name as it appears on valid ID.</p>
              </div>
            </div>
          </div>

          <!-- ② Service Selection -->
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                <span class="text-white text-xs font-black">2</span>
              </div>
              <div>
                <h2 class="text-sm font-bold text-slate-800">Service Selection</h2>
                <p class="text-xs text-slate-400">Choose a service category first</p>
              </div>
            </div>

            <div class="p-5">
              <!-- No services configured message -->
              <div v-if="serviceCategories.length === 0 && !loadingServices"
                class="flex items-center gap-3 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
                <span class="material-icons text-slate-400 text-[18px]">info</span>
                <p class="text-xs text-slate-500">
                  No services configured yet.
                  <RouterLink to="/settings" class="text-sky-500 font-semibold hover:underline">Add services in Settings</RouterLink>
                  to show them here.
                </p>
              </div>

              <!-- Loading -->
              <div v-if="loadingServices" class="flex justify-center py-6">
                <div class="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              </div>

              <!-- Category grid -->
              <div v-else-if="!selectedCategory" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  v-for="cat in serviceCategories"
                  :key="cat.id"
                  @click="selectedCategory = cat"
                  class="group flex flex-col items-start gap-2 px-4 py-4 rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors text-xl">
                    {{ cat.icon }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-700 group-hover:text-sky-700 leading-tight">{{ cat.label }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ cat.services.length }} service{{ cat.services.length !== 1 ? 's' : '' }}</p>
                  </div>
                </button>
              </div>

              <!-- Services within a category -->
              <div v-else class="space-y-3">
                <button
                  @click="selectedCategory = null; form.service_name = ''"
                  class="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800 transition-colors"
                >
                  <span class="material-icons text-[15px]">arrow_back</span>
                  <span>{{ selectedCategory.icon }} {{ selectedCategory.label }}</span>
                </button>
                <div class="grid grid-cols-1 gap-1.5">
                  <button
                    v-for="svc in selectedCategory.services"
                    :key="svc"
                    @click="form.service_name = svc"
                    :class="[
                      'flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                      form.service_name === svc
                        ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-200'
                        : 'bg-white border-gray-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                    ]"
                  >
                    <span :class="['material-icons text-[16px]', form.service_name === svc ? 'text-white' : 'text-slate-400']">
                      arrow_right
                    </span>
                    {{ svc }}
                  </button>
                </div>
              </div>

              <!-- Selected badge -->
              <div v-if="form.service_name"
                class="mt-3 flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
                <span class="material-icons text-sky-500 text-[18px]">check_circle</span>
                <span class="text-sm font-semibold text-sky-700 flex-1">{{ form.service_name }}</span>
                <button @click="form.service_name = ''; selectedCategory = null"
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-sky-400 hover:bg-sky-200 hover:text-sky-700 transition-colors">
                  <span class="material-icons text-[15px]">close</span>
                </button>
              </div>

              <!-- Hint when no category selected -->
              <p v-if="!selectedCategory && !form.service_name && serviceCategories.length > 0"
                class="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <span class="material-icons text-[14px]">info</span>
                Select a category to view available services and proceed with booking.
              </p>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="space-y-5">

          <!-- ③ Schedule & Summary -->
          <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-4">
            <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                <span class="text-white text-xs font-black">3</span>
              </div>
              <div>
                <h2 class="text-sm font-bold text-slate-800">Schedule &amp; Summary</h2>
                <p class="text-xs text-slate-400">Choose date, time and confirm details</p>
              </div>
            </div>

            <div class="p-5 space-y-5">
              <!-- Date picker -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-2">Select Date</label>
                <div class="flex items-center gap-2">
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">calendar_today</span>
                    <input
                      v-model="form.appointment_date"
                      type="date"
                      :min="today"
                      class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    @click="openNativeDatePicker"
                    class="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors"
                  >
                    <span class="material-icons text-[18px]">event</span>
                  </button>
                </div>
              </div>

              <!-- Time slots -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-2">Available Time Slots</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="slot in timeSlots"
                    :key="slot"
                    @click="form.time_slot = slot"
                    :class="[
                      'py-2.5 rounded-xl text-xs font-bold border transition-all',
                      form.time_slot === slot
                        ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-200'
                        : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                    ]"
                  >
                    {{ slot }}
                  </button>
                </div>
              </div>

              <!-- Doctor (if feature enabled) -->
              <div v-if="canSelectDoctor">
                <label class="block text-xs font-semibold text-slate-700 mb-2">Preferred Provider</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">person</span>
                  <select v-model="form.doctor_id"
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all appearance-none">
                    <option value="">Any Available Provider</option>
                    <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
                  </select>
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-2">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
                <textarea v-model="form.notes" rows="2"
                  placeholder="Allergies, special instructions…"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all resize-none">
                </textarea>
              </div>

              <!-- Appointment Summary -->
              <div class="border-t border-gray-100 pt-4">
                <h3 class="text-xs font-bold text-slate-700 mb-3">Appointment Summary</h3>
                <div class="space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[16px]">person_outline</span>
                      <span class="text-xs">Patient</span>
                    </div>
                    <div class="text-right">
                      <p v-if="isNewPatient && newPatientName" class="text-xs font-semibold text-slate-800">{{ newPatientName }}</p>
                      <p v-else-if="selectedPatient && !isNewPatient" class="text-xs font-semibold text-slate-800">{{ selectedPatient.full_name }}</p>
                      <p v-else class="text-xs text-slate-400">—</p>
                      <p v-if="isNewPatient" class="text-[10px] text-amber-500 font-semibold">New Patient</p>
                    </div>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[16px]">phone</span>
                      <span class="text-xs">Contact</span>
                    </div>
                    <p class="text-xs font-semibold text-slate-800">{{ contactNumber || '—' }}</p>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[16px]">label_outline</span>
                      <span class="text-xs">Service</span>
                    </div>
                    <p :class="['text-xs font-semibold', form.service_name ? 'text-slate-800' : 'text-slate-400']">
                      {{ form.service_name || 'Not selected' }}
                    </p>
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[16px]">event</span>
                      <span class="text-xs">Date &amp; Time</span>
                    </div>
                    <div class="text-right">
                      <p class="text-xs font-semibold text-slate-800">{{ formatDate(form.appointment_date) }}</p>
                      <p v-if="form.time_slot" class="text-xs text-slate-500">{{ form.time_slot }}</p>
                    </div>
                  </div>
                  <div v-if="canSelectDoctor" class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-slate-500">
                      <span class="material-icons text-[16px]">person</span>
                      <span class="text-xs">Provider</span>
                    </div>
                    <p class="text-xs font-semibold text-slate-800 text-right">
                      {{ form.doctor_id ? (doctors.find(d => d.id === form.doctor_id)?.full_name ?? '—') : 'Any Available Provider' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span class="material-icons text-red-500 text-[16px] mt-0.5 shrink-0">error_outline</span>
                <p class="text-xs text-red-600">{{ errorMsg }}</p>
              </div>

              <!-- Create Appointment CTA -->
              <button
                @click="handleSubmit"
                :disabled="saving || !canSubmit"
                class="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-sky-200 text-sm"
              >
                <span class="material-icons text-[18px]">{{ saving ? 'hourglass_empty' : 'event_available' }}</span>
                {{ saving ? 'Booking…' : 'Create Appointment' }}
              </button>

              <button
                @click="clearForm"
                class="w-full flex items-center justify-center gap-2 border border-gray-200 text-slate-500 hover:text-slate-700 hover:border-gray-300 font-semibold py-3 rounded-xl transition-all text-sm"
              >
                <span class="material-icons text-[16px]">refresh</span>
                Clear Form
              </button>

              <p class="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
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
import { clinicServicesService } from '@/services/clinic-services.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient, ClinicPlan, ClinicServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const { plan, isTrialActive, canUseFeature } = useClinic()

const effectivePlan = computed((): ClinicPlan =>
  isTrialActive.value ? 'premium' : (plan.value as ClinicPlan)
)

const canSelectDoctor = computed(() => canUseFeature('doctor_selection'))

// ── Patient search state ──
const contactNumber = ref('')
const newPatientName = ref('')
const selectedPatient = ref<Patient | null>(null)
const isNewPatient = ref(false)
const showNewPatientNotice = ref(false)
const searching = ref(false)
const searchResults = ref<Patient[]>([])
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// ── Service state ──
const selectedCategory = ref<ClinicServiceCategory | null>(null)
const serviceCategories = ref<ClinicServiceCategory[]>([])
const loadingServices = ref(false)

// ── Form state ──
const saving = ref(false)
const errorMsg = ref('')
const doctors = ref<{ id: string; full_name: string }[]>([])

const today = new Date().toISOString().split('T')[0]
const form = ref({
  appointment_date: today,
  time_slot: '',
  doctor_id: '',
  service_name: '',
  notes: '',
})

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM',
  '10:30 AM', '11:00 AM', '11:30 AM',
  '1:00 PM', '1:30 PM', '2:00 PM',
]

// ── Validation ──
const canSubmit = computed(() => {
  const hasPatient = (selectedPatient.value && !isNewPatient.value) ||
    (isNewPatient.value && newPatientName.value.trim())
  return !!(form.value.appointment_date && hasPatient && contactNumber.value)
})

// ── Patient search ──
function onContactInput() {
  // Reset state when user edits the number
  selectedPatient.value = null
  isNewPatient.value = false
  showNewPatientNotice.value = false
  searchResults.value = []

  if (searchTimeout) clearTimeout(searchTimeout)
  if (contactNumber.value.length >= 3) {
    searchTimeout = setTimeout(() => liveSearch(), 400)
  }
}

async function liveSearch() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  searching.value = true
  const { data } = await patientService.search(authStore.clinic.id, contactNumber.value)
  searching.value = false
  searchResults.value = data ?? []
}

async function searchPatient() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  searching.value = true
  searchResults.value = []
  selectedPatient.value = null
  isNewPatient.value = false
  showNewPatientNotice.value = false

  const { data } = await patientService.search(authStore.clinic.id, contactNumber.value)
  searching.value = false

  if (data && data.length > 0) {
    // Exact contact match?
    const exact = data.find(p => p.contact_number === contactNumber.value)
    if (exact) {
      selectExistingPatient(exact)
    } else {
      searchResults.value = data
    }
  } else {
    // No records — treat as new patient
    isNewPatient.value = true
    showNewPatientNotice.value = true
    newPatientName.value = ''
  }
}

function selectExistingPatient(p: Patient) {
  selectedPatient.value = p
  contactNumber.value = p.contact_number
  isNewPatient.value = false
  showNewPatientNotice.value = false
  searchResults.value = []
}

function clearPatient() {
  selectedPatient.value = null
  isNewPatient.value = false
  showNewPatientNotice.value = false
  searchResults.value = []
  contactNumber.value = ''
  newPatientName.value = ''
}

// ── Date picker helper ──
function openNativeDatePicker() {
  const input = document.querySelector('input[type="date"]') as HTMLInputElement | null
  input?.showPicker?.()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric'
  })
}

// ── Form clear ──
function clearForm() {
  clearPatient()
  newPatientName.value = ''
  form.value = { appointment_date: today, time_slot: '', doctor_id: '', service_name: '', notes: '' }
  selectedCategory.value = null
  errorMsg.value = ''
}

// ── Submit ──
async function handleSubmit() {
  if (!authStore.clinic?.id || !contactNumber.value) return
  saving.value = true
  errorMsg.value = ''

  let patientId = selectedPatient.value?.id

  if (isNewPatient.value && newPatientName.value.trim()) {
    const { data, error } = await patientService.findOrCreate(authStore.clinic.id, {
      full_name: newPatientName.value.trim(),
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

// ── Load clinic services ──
async function loadServices() {
  if (!authStore.clinic?.id) return
  loadingServices.value = true
  const { data } = await clinicServicesService.getCategories(authStore.clinic.id)
  loadingServices.value = false
  // Fall back to built-in categories if clinic has none configured
  if (data && data.length > 0) {
    serviceCategories.value = data
  } else {
    serviceCategories.value = SERVICE_CATEGORIES.map(c => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      services: c.services,
    }))
  }
}

onMounted(async () => {
  await loadServices()
  if (authStore.clinic?.id && canSelectDoctor.value) {
    doctors.value = await appointmentService.getDoctors(authStore.clinic.id)
  }
})
</script>