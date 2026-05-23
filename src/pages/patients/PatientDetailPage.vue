<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center gap-3">
        <RouterLink to="/patients" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Patient Profile</h1>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else-if="patient">

        <!-- Patient info -->
        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 bg-sky-500 rounded-full flex items-center justify-center text-white font-black text-2xl shrink-0">
              {{ patient.full_name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2 class="font-black text-slate-900 text-lg">{{ patient.full_name }}</h2>
              <p class="text-sm text-slate-400">{{ patient.contact_number }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div v-if="patient.birthdate">
              <p class="text-slate-400">Birthdate</p>
              <p class="font-semibold text-slate-700">{{ formatDate(patient.birthdate) }}</p>
            </div>
            <div v-if="patient.gender">
              <p class="text-slate-400">Gender</p>
              <p class="font-semibold text-slate-700 capitalize">{{ patient.gender }}</p>
            </div>
            <div v-if="patient.address" class="col-span-2">
              <p class="text-slate-400">Address</p>
              <p class="font-semibold text-slate-700">{{ patient.address }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-3">
          <RouterLink :to="`/medical-records/new?patient=${patient.id}`"
            class="bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold py-3 rounded-xl text-center transition-colors shadow-sm shadow-sky-200">
            📋 Add Record
          </RouterLink>
          <RouterLink :to="`/appointments/new?patient=${patient.id}`"
            class="bg-white border border-gray-200 hover:border-sky-300 text-slate-700 text-sm font-bold py-3 rounded-xl text-center transition-colors">
            📅 Book Appointment
          </RouterLink>
        </div>

        <!-- Medical history -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Medical History ({{ records.length }})
            </p>
          </div>

          <div v-if="records.length === 0"
            class="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div class="text-2xl mb-2">📋</div>
            <p class="text-sm font-semibold text-slate-600">No records yet</p>
            <p class="text-xs text-slate-400 mt-1">Medical records will appear here after consultations</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="record in records" :key="record.id"
              class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">

              <!-- Record header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-sky-500 rounded-full"></div>
                  <p class="text-xs font-bold text-slate-900">{{ formatDate(record.visit_date) }}</p>
                </div>
                <p class="text-xs text-slate-400">Dr. {{ record.profiles?.full_name ?? 'Unknown' }}</p>
              </div>

              <!-- Diagnosis -->
              <div v-if="record.diagnosis">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Diagnosis</p>
                <p class="text-sm text-slate-800 leading-relaxed">{{ record.diagnosis }}</p>
              </div>

              <!-- Prescription -->
              <div v-if="record.prescription" class="bg-green-50 border border-green-100 rounded-lg p-3">
                <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">💊 Prescription</p>
                <p class="text-sm text-green-900 leading-relaxed whitespace-pre-line">{{ record.prescription }}</p>
              </div>

              <!-- Notes -->
              <div v-if="record.notes">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                <p class="text-sm text-slate-600 leading-relaxed">{{ record.notes }}</p>
              </div>

            </div>
          </div>
        </div>

      </template>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import { medicalRecordService, type MedicalRecordWithDetails } from '@/services/medical-record.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient } from '@/types'

const route = useRoute()
const authStore = useAuthStore()

const patient = ref<Patient | null>(null)
const records = ref<MedicalRecordWithDetails[]>([])
const loading = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

onMounted(async () => {
  if (!authStore.clinic?.id) return
  const patientId = route.params.id as string

  const [patientRes, recordsRes] = await Promise.all([
    patientService.getById(authStore.clinic.id, patientId),
    medicalRecordService.getByPatient(authStore.clinic.id, patientId),
  ])

  if (patientRes.data) patient.value = patientRes.data
  if (recordsRes.data) records.value = recordsRes.data
  loading.value = false
})
</script>