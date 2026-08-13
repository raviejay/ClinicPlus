<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Back link -->
      <div class="flex items-center gap-3">
        <RouterLink to="/patients" class="text-slate-400 hover:text-slate-600 transition-colors">
          <span class="material-icons">arrow_back</span>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Patient Chart</h1>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else-if="patient">

        <!-- Chart header -->
        <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-md shadow-sky-200">
                {{ patient.full_name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <h2 class="font-black text-slate-900 text-xl truncate">{{ patient.full_name }}</h2>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                  <span class="flex items-center gap-1"><span class="material-icons text-sm text-slate-300">phone</span>{{ patient.contact_number }}</span>
                  <span v-if="patient.email" class="flex items-center gap-1"><span class="material-icons text-sm text-slate-300">mail</span>{{ patient.email }}</span>
                  <span v-if="age !== null" class="flex items-center gap-1"><span class="material-icons text-sm text-slate-300">cake</span>{{ age }} yrs old</span>
                  <span v-if="patient.gender" class="capitalize bg-slate-50 px-2 py-0.5 rounded-full font-medium">{{ patient.gender }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button @click="handleDownload" :disabled="exporting"
                class="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-sm font-bold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
                <span class="material-icons text-base">{{ exporting ? 'hourglass_top' : 'file_download' }}</span>
                {{ exporting ? 'Preparing…' : 'Download Chart' }}
              </button>
              <template v-if="!isReadOnly">
                <RouterLink :to="`/appointments/new?patient=${patient.id}`"
                  class="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-sky-300 text-slate-700 text-sm font-bold px-3.5 py-2 rounded-xl transition-colors">
                  <span class="material-icons text-base">event</span>
                  Book Appointment
                </RouterLink>
                <RouterLink :to="`/medical-records/new?patient=${patient.id}`"
                  class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
                  <span class="material-icons text-base">note_add</span>
                  Add Record
                </RouterLink>
              </template>
              <span v-else
                class="flex items-center gap-1.5 bg-slate-100 text-slate-400 text-sm font-bold px-3.5 py-2 rounded-xl cursor-not-allowed" title="Read-only — choose a plan to add records or appointments">
                <span class="material-icons text-base">lock</span>
                View only
              </span>
            </div>
          </div>

          <!-- Quick stats strip -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Visits</p>
              <p class="text-lg font-black text-slate-900 mt-0.5">{{ records.length }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Visit</p>
              <p class="text-lg font-black text-slate-900 mt-0.5">{{ lastVisitLabel }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upcoming</p>
              <p class="text-lg font-black text-slate-900 mt-0.5">{{ upcomingCount }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Paid</p>
              <p class="text-lg font-black text-slate-900 mt-0.5">₱{{ totalPaid.toLocaleString() }}</p>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="flex border-b border-gray-100 overflow-x-auto">
            <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
              :class="['flex items-center gap-1.5 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600']">
              <span class="material-icons text-base">{{ tab.icon }}</span>
              {{ tab.label }}
              <span v-if="tab.count !== undefined" class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{{ tab.count }}</span>
            </button>
          </div>

          <div class="p-5">

            <!-- Overview tab -->
            <div v-if="activeTab === 'overview'" class="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Birthdate</p>
                <p class="text-sm font-semibold text-slate-800">{{ patient.birthdate ? formatDate(patient.birthdate) : '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                <p class="text-sm font-semibold text-slate-800 capitalize">{{ patient.gender ?? '—' }}</p>
              </div>
              <div class="sm:col-span-2">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
                <p class="text-sm font-semibold text-slate-800">{{ patient.address ?? '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Patient Since</p>
                <p class="text-sm font-semibold text-slate-800">{{ formatDate(patient.created_at) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Record ID</p>
                <p class="text-xs font-mono text-slate-500">{{ patient.id }}</p>
              </div>

              <div v-if="latestRecord" class="sm:col-span-2 mt-2 pt-4 border-t border-gray-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Most Recent Diagnosis</p>
                <div class="bg-slate-50 rounded-xl p-4">
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs font-bold text-slate-900">{{ formatDate(latestRecord.visit_date) }}</p>
                    <p class="text-xs text-slate-400">Dr. {{ latestRecord.profiles?.full_name ?? 'Unknown' }}</p>
                  </div>
                  <p class="text-sm text-slate-700">{{ latestRecord.diagnosis || 'No diagnosis recorded' }}</p>
                </div>
              </div>
            </div>

            <!-- Visit History tab -->
            <div v-else-if="activeTab === 'history'">
              <div v-if="records.length === 0" class="text-center py-10">
                <span class="material-icons text-4xl text-slate-200">folder_open</span>
                <p class="text-sm font-semibold text-slate-600 mt-2">No records yet</p>
                <p class="text-xs text-slate-400 mt-1">Medical records will appear here after consultations</p>
              </div>
              <div v-else class="space-y-3">
                <div v-for="record in records" :key="record.id"
                  class="border border-gray-100 rounded-xl p-4 space-y-3 hover:border-sky-100 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 bg-sky-500 rounded-full"></div>
                      <p class="text-xs font-bold text-slate-900">{{ formatDate(record.visit_date) }}</p>
                    </div>
                    <p class="text-xs text-slate-400">Dr. {{ record.profiles?.full_name ?? 'Unknown' }}</p>
                  </div>
                  <div v-if="record.diagnosis">
                    <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Diagnosis</p>
                    <p class="text-sm text-slate-800 leading-relaxed">{{ record.diagnosis }}</p>
                  </div>
                  <div v-if="record.prescription" class="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p class="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">💊 Prescription</p>
                    <p class="text-sm text-green-900 leading-relaxed whitespace-pre-line">{{ record.prescription }}</p>
                  </div>
                  <div v-if="record.notes">
                    <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                    <p class="text-sm text-slate-600 leading-relaxed">{{ record.notes }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Appointments tab -->
            <div v-else-if="activeTab === 'appointments'">
              <div v-if="appointments.length === 0" class="text-center py-10">
                <span class="material-icons text-4xl text-slate-200">event_busy</span>
                <p class="text-sm font-semibold text-slate-600 mt-2">No appointments yet</p>
              </div>
              <table v-else class="w-full text-sm">
                <thead>
                  <tr class="text-left border-b border-gray-100">
                    <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                    <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doctor</th>
                    <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service</th>
                    <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in appointments" :key="a.id" class="border-b border-gray-50 last:border-0">
                    <td class="py-2.5 font-semibold text-slate-800">{{ formatDate(a.appointment_date) }}</td>
                    <td class="py-2.5 text-slate-500">{{ a.time_slot ?? '—' }}</td>
                    <td class="py-2.5 text-slate-500">{{ a.profiles?.full_name ?? 'Unassigned' }}</td>
                    <td class="py-2.5 text-slate-500">{{ a.service_name ?? '—' }}</td>
                    <td class="py-2.5">
                      <span :class="statusBadgeClass(a.status)" class="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{{ a.status.replace('_', ' ') }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Billing tab -->
            <div v-else-if="activeTab === 'billing'">
              <div v-if="payments.length === 0" class="text-center py-10">
                <span class="material-icons text-4xl text-slate-200">receipt_long</span>
                <p class="text-sm font-semibold text-slate-600 mt-2">No payments recorded</p>
              </div>
              <template v-else>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left border-b border-gray-100">
                      <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                      <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                      <th class="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in payments" :key="p.id" class="border-b border-gray-50 last:border-0">
                      <td class="py-2.5 font-semibold text-slate-800">{{ formatDateTime(p.paid_at) }}</td>
                      <td class="py-2.5 text-slate-800 font-semibold">₱{{ Number(p.amount).toLocaleString() }}</td>
                      <td class="py-2.5 text-slate-500 uppercase text-xs font-semibold">{{ p.payment_method }}</td>
                      <td class="py-2.5">
                        <span :class="p.status === 'paid' ? 'bg-green-50 text-green-700' : p.status === 'refunded' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'" class="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{{ p.status }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div class="flex justify-end mt-3 pt-3 border-t border-gray-100">
                  <p class="text-sm font-black text-slate-900">Total Paid: ₱{{ totalPaid.toLocaleString() }}</p>
                </div>
              </template>
            </div>

          </div>
        </div>

      </template>

      <div v-else class="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <span class="material-icons text-4xl text-slate-200">person_off</span>
        <p class="text-sm font-semibold text-slate-600 mt-2">Patient not found</p>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import { medicalRecordService, type MedicalRecordWithDetails } from '@/services/medical-record.service'
import { appointmentService } from '@/services/appointment.service'
import { paymentService } from '@/services/payment.service'
import { exportPatientToExcel } from '@/utils/patientExport'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient, Payment, Appointment } from '@/types'

type AppointmentWithDoctor = Appointment & { profiles: { full_name: string | null } | null }

const route = useRoute()
const authStore = useAuthStore()
const { isReadOnly } = useClinic()

const patient = ref<Patient | null>(null)
const records = ref<MedicalRecordWithDetails[]>([])
const appointments = ref<AppointmentWithDoctor[]>([])
const payments = ref<Payment[]>([])
const loading = ref(true)
const exporting = ref(false)
const activeTab = ref<'overview' | 'history' | 'appointments' | 'billing'>('overview')

const tabs = computed(() => [
  { id: 'overview' as const, label: 'Overview', icon: 'person' },
  { id: 'history' as const, label: 'Visit History', icon: 'history_edu', count: records.value.length },
  { id: 'appointments' as const, label: 'Appointments', icon: 'event', count: appointments.value.length },
  { id: 'billing' as const, label: 'Billing', icon: 'payments', count: payments.value.length },
])

const latestRecord = computed(() => records.value[0] ?? null)

const age = computed(() => {
  if (!patient.value?.birthdate) return null
  const dob = new Date(patient.value.birthdate)
  const diff = Date.now() - dob.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
})

const lastVisitLabel = computed(() => {
  if (!latestRecord.value) return '—'
  return formatDate(latestRecord.value.visit_date)
})

const upcomingCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return appointments.value.filter(a => a.appointment_date >= today && !['cancelled', 'completed', 'no_show'].includes(a.status)).length
})

const totalPaid = computed(() =>
  payments.value.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
)

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-sky-50 text-sky-700',
    in_queue: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
    no_show: 'bg-slate-100 text-slate-500',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function handleDownload() {
  if (!patient.value) return
  exporting.value = true
  try {
    exportPatientToExcel(patient.value, records.value, appointments.value, payments.value)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  if (!authStore.clinic?.id) return
  const clinicId = authStore.clinic.id
  const patientId = route.params.id as string

  const [patientRes, recordsRes, appointmentsRes, paymentsRes] = await Promise.all([
    patientService.getById(clinicId, patientId),
    medicalRecordService.getByPatient(clinicId, patientId),
    appointmentService.getByPatient(clinicId, patientId),
    paymentService.getByPatient(clinicId, patientId),
  ])

  if (patientRes.data) patient.value = patientRes.data
  if (recordsRes.data) records.value = recordsRes.data
  if (appointmentsRes.data) appointments.value = appointmentsRes.data
  if (paymentsRes.data) payments.value = paymentsRes.data
  loading.value = false
})
</script>