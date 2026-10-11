<template>
  <AppLayout>
    <div class="space-y-4 max-w-xl mx-auto">

      <div class="flex items-center gap-3">
        <RouterLink to="/revenue" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Back to revenue">
          <span class="material-icons">arrow_back</span>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Record Payment</h1>
      </div>

      <!-- Saved -->
      <div v-if="saved" class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-4" role="status">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span class="material-icons text-green-500 text-4xl">check</span>
        </div>
        <div>
          <h2 class="text-xl font-black text-slate-900">Payment recorded</h2>
          <p class="text-sm text-slate-500 mt-1">{{ patient?.full_name }} · {{ methodMeta(saved.payment_method).label }}</p>
        </div>
        <p class="text-4xl font-black text-green-600">₱{{ formatMoney(saved.amount) }}</p>
        <div v-if="saved.receipt_number" class="inline-flex flex-col items-center bg-slate-50 border border-dashed border-gray-300 rounded-xl px-5 py-2.5">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt</span>
          <span class="font-mono text-lg font-black tracking-widest text-slate-800">{{ saved.receipt_number }}</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 pt-1">
          <button type="button" @click="printSaved"
            class="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            <span class="material-icons text-[16px]">print</span>Print receipt
          </button>
          <button type="button" @click="recordAnother"
            class="flex-1 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">Record another</button>
        </div>
        <RouterLink to="/revenue" class="block text-sm font-semibold text-sky-600 hover:text-sky-700">Back to revenue</RouterLink>
      </div>

      <!-- Form -->
      <div v-else class="bg-white border border-gray-200 rounded-2xl p-5 space-y-5 shadow-sm">

        <PatientLookup v-model="patient" label="Patient" required />

        <!-- Link to a visit -->
        <div v-if="patient && visits.length > 0">
          <p class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Which visit is this for? <span class="normal-case font-normal text-slate-400">(optional)</span>
          </p>
          <div class="space-y-1.5" role="radiogroup" aria-label="Visit">
            <button v-for="v in visits" :key="v.id" type="button" role="radio" :aria-checked="selectedVisit?.id === v.id"
              :disabled="v.paid" @click="chooseVisit(v)"
              :class="['w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-colors',
                v.paid ? 'bg-slate-50 border-gray-100 text-slate-300 cursor-not-allowed'
                  : selectedVisit?.id === v.id ? 'bg-sky-50 border-sky-400' : 'bg-white border-gray-200 hover:border-sky-300']">
              <span class="material-icons text-[18px]" :class="selectedVisit?.id === v.id ? 'text-sky-500' : 'text-slate-300'">
                {{ selectedVisit?.id === v.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
              <span class="min-w-0 flex-1">
                <span class="block font-semibold truncate" :class="v.paid ? '' : 'text-slate-800'">{{ v.service || 'Visit' }}</span>
                <span class="block text-xs text-slate-400 truncate">{{ dayLabel(v.date) }}<template v-if="v.time"> · {{ v.time }}</template><template v-if="v.doctor"> · Dr. {{ v.doctor }}</template></span>
              </span>
              <span v-if="v.paid" class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Paid</span>
            </button>
            <button type="button" role="radio" :aria-checked="selectedVisit === null" @click="chooseVisit(null)"
              :class="['w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-colors',
                selectedVisit === null ? 'bg-sky-50 border-sky-400' : 'bg-white border-gray-200 hover:border-sky-300']">
              <span class="material-icons text-[18px]" :class="selectedVisit === null ? 'text-sky-500' : 'text-slate-300'">
                {{ selectedVisit === null ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
              <span class="font-semibold text-slate-700">Walk-in / not linked to a visit</span>
            </button>
          </div>
        </div>

        <!-- Amount -->
        <div>
          <label for="pay-amount" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Amount (₱) <span class="text-red-400">*</span>
          </label>
          <input id="pay-amount" v-model.number="form.amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all text-lg font-bold" />
          <div class="flex flex-wrap gap-2 mt-2">
            <button v-for="amt in quickAmounts" :key="amt" type="button" @click="form.amount = amt"
              :class="['px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                form.amount === amt ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">
              ₱{{ amt.toLocaleString() }}
            </button>
          </div>
        </div>

        <!-- Method -->
        <div>
          <p class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Payment method</p>
          <div class="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Payment method">
            <button v-for="(m, key) in METHODS" :key="key" type="button" role="radio" :aria-checked="form.payment_method === key"
              @click="form.payment_method = key"
              :class="['py-3 rounded-xl text-sm font-semibold border transition-colors flex flex-col items-center gap-1',
                form.payment_method === key ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">
              <span class="text-lg">{{ m.icon }}</span>
              <span class="text-[11px]">{{ m.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="methodMeta(form.payment_method).needsReference">
          <label for="pay-ref" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Reference no. <span class="normal-case font-normal text-slate-400">(optional — from the {{ methodMeta(form.payment_method).label }} receipt)</span>
          </label>
          <input id="pay-ref" v-model="form.reference" type="text" maxlength="100" autocomplete="off" placeholder="e.g. 1234 567 890"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white font-mono" />
        </div>

        <div>
          <label for="pay-desc" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            What is it for? <span class="normal-case font-normal text-slate-400">(optional)</span>
          </label>
          <input id="pay-desc" v-model="form.description" @input="descriptionTouched = true" type="text" maxlength="200" list="pay-services"
            placeholder="e.g. Check-up, Vaccination, Lab test"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white" />
          <datalist id="pay-services"><option v-for="s in serviceNames" :key="s" :value="s" /></datalist>
        </div>

        <div>
          <button v-if="!showNotes" type="button" @click="showNotes = true"
            class="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            <span class="material-icons text-[15px]">add</span>Add a note
          </button>
          <template v-else>
            <label for="pay-notes" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Note</label>
            <textarea id="pay-notes" v-model="form.notes" rows="2" maxlength="1000" placeholder="Anything worth remembering about this payment"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white resize-none"></textarea>
          </template>
        </div>

        <!-- Summary -->
        <div v-if="patient && amountValid" class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-slate-500">Patient</span><span class="font-semibold text-slate-900">{{ patient.full_name }}</span></div>
          <div v-if="form.description.trim()" class="flex items-center justify-between"><span class="text-slate-500">For</span><span class="text-slate-800">{{ form.description.trim() }}</span></div>
          <div class="flex items-center justify-between"><span class="text-slate-500">Method</span><span class="font-semibold text-slate-900">{{ methodMeta(form.payment_method).label }}</span></div>
          <div class="flex items-center justify-between"><span class="text-slate-500">Amount</span><span class="font-black text-green-600 text-lg">₱{{ formatMoney(Number(form.amount)) }}</span></div>
        </div>

        <div v-if="duplicateWarning" role="alert" class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span class="material-icons text-amber-500 text-[18px] mt-px">warning</span>
          <p class="text-xs text-amber-800">
            A payment of ₱{{ formatMoney(Number(form.amount)) }} was just recorded for {{ patient?.full_name }}. Choose “Record anyway” only if this is a second payment.
          </p>
        </div>

        <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span class="material-icons text-red-500 text-[18px]">error</span>
          <p class="text-xs text-red-600">{{ errorMsg }}</p>
        </div>

        <button type="button" @click="handleSave" :disabled="saving || !patient || !amountValid"
          class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-md shadow-green-200">
          {{ saving ? 'Recording…' : duplicateWarning ? 'Record anyway' : 'Confirm Payment' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { paymentService } from '@/services/payment.service'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import { clinicServicesService } from '@/services/clinic-services.service'
import AppLayout from '@/layouts/AppLayout.vue'
import PatientLookup from '@/components/ui/PatientLookup.vue'
import { printReceipt } from '@/utils/receipt'
import { parseDbTimestamp } from '@/utils/billing'
import { METHODS, dayLabel, formatMoney, manilaDateOf, methodMeta } from '@/utils/revenue'
import type { Patient, Payment, PaymentMethod } from '@/types'

interface VisitOption {
  id: string
  date: string
  time: string | null
  service: string | null
  doctor: string | null
  branch_id: string | null
  paid: boolean
}

const route = useRoute()
const authStore = useAuthStore()
const branchStore = useBranchStore()

const patient = ref<Patient | null>(null)
const visits = ref<VisitOption[]>([])
const selectedVisit = ref<VisitOption | null>(null)
const patientPayments = ref<Payment[]>([])
const serviceNames = ref<string[]>([])
const saving = ref(false)
const saved = ref<Payment | null>(null)
const errorMsg = ref('')
const showNotes = ref(false)
const descriptionTouched = ref(false)
const duplicateAcknowledged = ref(false)

const form = ref({
  amount: 0 as number | '',
  payment_method: 'cash' as PaymentMethod,
  reference: '',
  description: '',
  notes: '',
})

const quickAmounts = [100, 200, 300, 500, 1000, 1500]
const MAX_AMOUNT = 10_000_000

const amountValid = computed(() => {
  const n = Number(form.value.amount)
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT
})

// The same amount for the same patient in the last few minutes is most likely a double tap
const duplicateWarning = computed(() => {
  if (!patient.value || !amountValid.value || duplicateAcknowledged.value) return false
  const now = Date.now()
  return patientPayments.value.some(p =>
    p.status === 'paid' && Number(p.amount) === Number(form.value.amount) &&
    now - parseDbTimestamp(p.paid_at).getTime() < 5 * 60_000)
})

// Recent visits for the chosen patient, with which of them are already paid
async function loadPatientContext(p: Patient) {
  const clinicId = authStore.clinic?.id
  if (!clinicId) return
  const [appts, pays] = await Promise.all([
    appointmentService.getByPatient(clinicId, p.id),
    paymentService.getByPatient(clinicId, p.id),
  ])
  patientPayments.value = pays.data ?? []

  const cutoff = Date.now() - 45 * 86_400_000
  const paidIds = new Set(patientPayments.value.filter(x => x.status === 'paid' && x.appointment_id).map(x => x.appointment_id))
  const paidDays = new Set(patientPayments.value.filter(x => x.status === 'paid' && !x.appointment_id).map(x => manilaDateOf(x.paid_at)))

  visits.value = (appts.data ?? [])
    .filter(a => !['cancelled', 'no_show'].includes(a.status) && new Date(`${a.appointment_date}T00:00:00Z`).getTime() >= cutoff)
    .map(a => ({
      id: a.id,
      date: String(a.appointment_date).slice(0, 10),
      time: a.time_slot,
      service: a.service_name,
      doctor: (a as any).profiles?.full_name ?? null,
      branch_id: a.branch_id,
      paid: paidIds.has(a.id) || paidDays.has(String(a.appointment_date).slice(0, 10)),
    }))
}

function chooseVisit(v: VisitOption | null) {
  selectedVisit.value = v
  // Suggest the visit's service as the description, unless the user already typed one
  if (v?.service && (!descriptionTouched.value || !form.value.description.trim())) {
    form.value.description = v.service
    descriptionTouched.value = false
  } else if (!v && !descriptionTouched.value) {
    form.value.description = ''
  }
}

watch(patient, async p => {
  visits.value = []
  selectedVisit.value = null
  patientPayments.value = []
  duplicateAcknowledged.value = false
  if (p) {
    await loadPatientContext(p)
    // Arrived from "Collect" with a visit chosen
    const wanted = route.query.appointment as string | undefined
    const match = wanted ? visits.value.find(v => v.id === wanted && !v.paid) : undefined
    if (match) chooseVisit(match)
  }
})

// Editing the amount or patient starts the duplicate check over
watch(() => form.value.amount, () => { duplicateAcknowledged.value = false })

async function handleSave() {
  const clinicId = authStore.clinic?.id
  if (!clinicId || !patient.value || !amountValid.value || saving.value) return

  saving.value = true
  errorMsg.value = ''

  const branchId = selectedVisit.value?.branch_id
    ?? patient.value.branch_id
    ?? (branchStore.isViewingAll ? null : branchStore.activeBranchId)

  const { data, error } = await paymentService.create({
    clinic_id: clinicId,
    patient_id: patient.value.id,
    appointment_id: selectedVisit.value?.id,
    branch_id: branchId,
    amount: Number(form.value.amount),
    payment_method: form.value.payment_method,
    description: form.value.description.trim() || undefined,
    reference: form.value.reference.trim() || undefined,
    notes: form.value.notes.trim() || undefined,
  })

  saving.value = false
  if (error || !data) {
    errorMsg.value = error ?? 'Could not record the payment.'
    return
  }
  saved.value = data
}

function printSaved() {
  const p = saved.value
  if (!p || !patient.value) return
  const branch = branchStore.branches.find(b => b.id === p.branch_id)
  printReceipt({
    clinicName: authStore.clinic?.name ?? 'Clinic',
    branchName: branch?.name ?? null,
    address: branch?.address ?? null,
    phone: branch?.contact_number ?? null,
    receiptNumber: p.receipt_number ?? '—',
    paidAt: p.paid_at,
    patientName: patient.value.full_name,
    description: p.description,
    method: p.payment_method,
    reference: p.reference,
    amount: Number(p.amount),
    status: p.status,
    recordedBy: authStore.profile?.full_name ?? null,
  })
}

function recordAnother() {
  saved.value = null
  patient.value = null
  selectedVisit.value = null
  visits.value = []
  errorMsg.value = ''
  showNotes.value = false
  descriptionTouched.value = false
  duplicateAcknowledged.value = false
  form.value = { amount: 0, payment_method: 'cash', reference: '', description: '', notes: '' }
}

onMounted(async () => {
  const clinicId = authStore.clinic?.id
  if (!clinicId) return

  clinicServicesService.getCategories(clinicId).then(({ data }) => {
    serviceNames.value = [...new Set((data ?? []).flatMap(c => c.services))]
  })

  // "Collect" on the Revenue page opens this with the patient already chosen
  const patientId = route.query.patient as string | undefined
  if (patientId) {
    const { data } = await patientService.getById(clinicId, patientId)
    if (data) patient.value = data
  }
})
</script>
