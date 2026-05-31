<template>
  <AppLayout>
    <div class="max-w-2xl mx-auto space-y-5">

      <!-- Page header -->
      <div class="flex items-center gap-3">
        <RouterLink to="/appointments"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-slate-400 hover:text-slate-700 hover:border-gray-300 shadow-sm transition-all">
          <span class="material-icons text-[18px]">arrow_back</span>
        </RouterLink>
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">New Appointment</h1>
          <p class="text-xs text-slate-400 mt-0.5">Fill in the details below to book a slot</p>
        </div>
      </div>

      <!-- Step 1 — Patient -->
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div class="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
            <span class="material-icons text-sky-500 text-[15px]">person</span>
          </div>
          <h2 class="text-sm font-bold text-slate-800">Patient</h2>
        </div>

        <div class="p-5 space-y-4">
          <!-- Contact lookup -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Contact Number <span class="text-red-400">*</span>
            </label>
            <div class="flex gap-2">
              <div class="flex-1 relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">phone</span>
                <input v-model="contactNumber" type="tel" placeholder="09XXXXXXXXX"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all" />
              </div>
              <button @click="lookupPatient" :disabled="!contactNumber || lookingUp"
                class="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm shadow-sky-200">
                <span class="material-icons text-[16px]">{{ lookingUp ? 'hourglass_empty' : 'search' }}</span>
                <span>{{ lookingUp ? 'Searching…' : 'Find' }}</span>
              </button>
            </div>
          </div>

          <!-- Patient found / new patient -->
          <div v-if="patient"
            :class="['flex items-center gap-3 rounded-xl px-4 py-3 border transition-all',
              isNewPatient
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200']">
            <div :class="['w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
              isNewPatient ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600']">
              {{ patient.full_name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-semibold truncate', isNewPatient ? 'text-amber-800' : 'text-green-800']">
                {{ patient.full_name === '_temp_' ? contactNumber : patient.full_name }}
              </p>
              <div class="flex items-center gap-1 mt-0.5">
                <span :class="['material-icons text-[13px]', isNewPatient ? 'text-amber-400' : 'text-green-400']">
                  {{ isNewPatient ? 'person_add' : 'check_circle' }}
                </span>
                <p :class="['text-xs', isNewPatient ? 'text-amber-600' : 'text-green-600']">
                  {{ isNewPatient ? 'New patient — will be registered' : 'Existing patient found' }}
                </p>
              </div>
            </div>
          </div>

          <!-- New patient name field -->
          <div v-if="showNewPatientFields">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Full Name <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">badge</span>
              <input v-model="newPatientName" type="text" placeholder="Juan Dela Cruz"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all" />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2 — Service -->
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div class="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <span class="material-icons text-violet-500 text-[15px]">medical_services</span>
          </div>
          <h2 class="text-sm font-bold text-slate-800">Service / Reason for Visit</h2>
          <span v-if="form.service_name"
            class="ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">
            <span class="material-icons text-[11px]">check</span> Selected
          </span>
        </div>

        <div class="p-5">
          <!-- Category grid -->
          <div v-if="!selectedCategory" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button v-for="cat in SERVICE_CATEGORIES" :key="cat.id"
              @click="selectedCategory = cat"
              class="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all text-center">
              <span class="text-2xl">{{ cat.icon }}</span>
              <span class="text-xs font-semibold text-slate-600 group-hover:text-sky-700 leading-tight">{{ cat.label }}</span>
            </button>
          </div>

          <!-- Services within category -->
          <div v-else class="space-y-3">
            <button @click="selectedCategory = null; form.service_name = ''"
              class="flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:text-sky-800 transition-colors">
              <span class="material-icons text-[15px]">arrow_back</span>
              <span>{{ selectedCategory.icon }} {{ selectedCategory.label }}</span>
            </button>
            <div class="grid grid-cols-1 gap-1.5">
              <button v-for="svc in selectedCategory.services" :key="svc"
                @click="form.service_name = svc"
                :class="[
                  'flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                  form.service_name === svc
                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-200'
                    : 'bg-white border-gray-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                ]">
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
        </div>
      </div>

      <!-- Step 3 — Schedule -->
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <span class="material-icons text-emerald-500 text-[15px]">calendar_month</span>
          </div>
          <h2 class="text-sm font-bold text-slate-800">Schedule</h2>
        </div>

        <div class="p-5 space-y-5">
          <!-- Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Appointment Date <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">event</span>
              <input v-model="form.appointment_date" type="date" :min="today"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all" />
            </div>
          </div>

          <!-- Time slots -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
              Time Slot
              <span v-if="form.time_slot" class="ml-2 normal-case font-bold text-sky-500">— {{ form.time_slot }}</span>
            </label>
            <div class="grid grid-cols-4 gap-2">
              <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
                :class="[
                  'py-2.5 rounded-xl text-xs font-bold border transition-all',
                  form.time_slot === slot
                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-200'
                    : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                ]">
                {{ slot }}
              </button>
            </div>
          </div>

          <!-- Doctor -->
          <div v-if="canSelectDoctor">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Preferred Doctor
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">stethoscope</span>
              <select v-model="form.doctor_id"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all appearance-none">
                <option value="">Any available doctor</option>
                <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
              </select>
              <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Additional Notes
            </label>
            <div class="relative">
              <span class="absolute left-3 top-3.5 material-icons text-slate-400 text-[18px]">notes</span>
              <textarea v-model="form.notes" rows="3"
                placeholder="Allergies, special instructions, other concerns…"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all resize-none">
              </textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMsg"
        class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <span class="material-icons text-red-500 text-[18px] mt-0.5 shrink-0">error_outline</span>
        <p class="text-sm text-red-600">{{ errorMsg }}</p>
      </div>

      <!-- Submit -->
      <button @click="handleSubmit" :disabled="saving || !canSubmit"
        class="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-sky-200 text-sm">
        <span class="material-icons text-[18px]">{{ saving ? 'hourglass_empty' : 'event_available' }}</span>
        {{ saving ? 'Booking…' : 'Confirm Appointment' }}
      </button>

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

const timeSlots = ['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM']

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
