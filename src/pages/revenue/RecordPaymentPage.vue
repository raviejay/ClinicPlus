<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center gap-3">
        <RouterLink to="/revenue" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Record Payment</h1>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        <!-- Patient lookup -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
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
        </div>

        <!-- Patient found -->
        <div v-if="patient" class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
            {{ patient.full_name.charAt(0) }}
          </div>
          <div>
            <p class="text-sm font-semibold text-green-800">{{ patient.full_name }}</p>
            <p class="text-xs text-green-600">{{ patient.contact_number }}</p>
          </div>
        </div>

        <p v-if="patientError" class="text-xs text-red-500">{{ patientError }}</p>

        <!-- Amount -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Amount (₱) <span class="text-red-400">*</span>
          </label>
          <input v-model="form.amount" type="number" min="0" step="0.01" placeholder="0.00"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all text-lg font-bold" />
        </div>

        <!-- Quick amounts -->
        <div class="flex flex-wrap gap-2">
          <button v-for="amt in quickAmounts" :key="amt" @click="form.amount = amt"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              form.amount === amt ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'
            ]">
            ₱{{ amt.toLocaleString() }}
          </button>
        </div>

        <!-- Payment method -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Payment Method</label>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="method in methods" :key="method.value" @click="form.payment_method = method.value"
              :class="[
                'py-3 rounded-xl text-sm font-semibold border transition-colors flex flex-col items-center gap-1',
                form.payment_method === method.value
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'
              ]">
              <span class="text-lg">{{ method.icon }}</span>
              <span class="text-xs">{{ method.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-red-600">{{ errorMsg }}</p>
        </div>

        <!-- Summary before confirm -->
        <div v-if="patient && form.amount > 0" class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-500">Patient</span>
            <span class="font-semibold text-slate-900">{{ patient.full_name }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mt-2">
            <span class="text-slate-500">Amount</span>
            <span class="font-black text-green-600 text-lg">₱{{ Number(form.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mt-2">
            <span class="text-slate-500">Method</span>
            <span class="font-semibold text-slate-900 capitalize">{{ form.payment_method }}</span>
          </div>
        </div>

        <button @click="handleSave" :disabled="saving || !patient || !form.amount"
          class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-green-200">
          {{ saving ? 'Recording…' : 'Confirm Payment ₱' + (form.amount ? Number(form.amount).toLocaleString() : '0') }}
        </button>

      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { patientService } from '@/services/patient.service'
import { paymentService } from '@/services/payment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Patient } from '@/types'

type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card' | 'other'

const router = useRouter()
const authStore = useAuthStore()

const patient = ref<Patient | null>(null)
const contactNumber = ref('')
const lookingUp = ref(false)
const patientError = ref('')
const saving = ref(false)
const errorMsg = ref('')

const form = ref({ amount: 0, payment_method: 'cash' as PaymentMethod })

const quickAmounts = [100, 200, 300, 500, 1000, 1500]

const methods: Array<{ value: 'cash' | 'gcash' | 'maya' | 'card' | 'other'; label: string; icon: string }> = [
  { value: 'cash',  label: 'Cash',  icon: '💵' },
  { value: 'gcash', label: 'GCash', icon: '📱' },
  { value: 'maya',  label: 'Maya',  icon: '💜' },
  { value: 'card',  label: 'Card',  icon: '💳' },
  { value: 'other', label: 'Other', icon: '🏦' },
]

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
    patientError.value = 'Patient not found.'
  }
}

async function handleSave() {
  if (!authStore.clinic?.id || !patient.value || !form.value.amount) return
  saving.value = true
  errorMsg.value = ''

  const { error } = await paymentService.create({
    clinic_id: authStore.clinic.id,
    patient_id: patient.value.id,
    amount: Number(form.value.amount),
    payment_method: form.value.payment_method,
  })

  saving.value = false
  if (error) { errorMsg.value = error; return }
  router.push('/revenue')
}
</script>