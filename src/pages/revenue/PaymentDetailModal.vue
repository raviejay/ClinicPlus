<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
    role="dialog" aria-modal="true" aria-labelledby="payment-title" @click.self="$emit('close')">
    <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

      <!-- Header -->
      <div class="p-6 pb-4 text-center border-b border-gray-100 relative">
        <button type="button" @click="$emit('close')" aria-label="Close"
          class="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
          <span class="material-icons text-[18px]">close</span>
        </button>
        <p id="payment-title" class="font-mono text-xs font-bold tracking-widest text-slate-400">{{ payment.receipt_number ?? 'No receipt number' }}</p>
        <p class="text-4xl font-black tracking-tight mt-1"
          :class="payment.status === 'paid' ? 'text-slate-900' : 'text-slate-300 line-through'">
          ₱{{ formatMoney(payment.amount) }}
        </p>
        <span class="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold" :class="status.classes">{{ status.label }}</span>
      </div>

      <!-- Details -->
      <dl class="px-6 py-4 space-y-2.5 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-slate-400">Patient</dt>
          <dd class="font-semibold text-slate-900 text-right">{{ payment.patients?.full_name ?? 'Unknown' }}</dd></div>
        <div v-if="payment.patients?.contact_number" class="flex justify-between gap-4"><dt class="text-slate-400">Contact</dt>
          <dd class="text-slate-700 text-right">{{ payment.patients.contact_number }}</dd></div>
        <div v-if="forWhat" class="flex justify-between gap-4"><dt class="text-slate-400">For</dt>
          <dd class="text-slate-700 text-right">{{ forWhat }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-slate-400">Method</dt>
          <dd class="text-slate-700 text-right">{{ method.icon }} {{ method.label }}</dd></div>
        <div v-if="payment.reference" class="flex justify-between gap-4"><dt class="text-slate-400">Reference</dt>
          <dd class="font-mono text-xs text-slate-700 text-right break-all">{{ payment.reference }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-slate-400">Date</dt>
          <dd class="text-slate-700 text-right">{{ manilaDateTimeLabel(payment.paid_at) }}</dd></div>
        <div v-if="payment.recorder?.full_name" class="flex justify-between gap-4"><dt class="text-slate-400">Recorded by</dt>
          <dd class="text-slate-700 text-right">{{ payment.recorder.full_name }}</dd></div>
        <div v-if="payment.notes" class="pt-1"><dt class="text-slate-400 mb-1">Notes</dt>
          <dd class="text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{{ payment.notes }}</dd></div>
      </dl>

      <!-- Why it was refunded / voided -->
      <div v-if="payment.status_reason" class="mx-6 mb-4 rounded-xl border px-4 py-3 text-sm"
        :class="payment.status === 'voided' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-200 text-amber-800'">
        <p class="font-bold text-xs uppercase tracking-wide mb-1">{{ payment.status === 'voided' ? 'Voided' : 'Refunded' }}
          <template v-if="payment.status_changed_at"> · {{ manilaDateTimeLabel(payment.status_changed_at) }}</template>
          <template v-if="payment.changer?.full_name"> · {{ payment.changer.full_name }}</template></p>
        <p>{{ payment.status_reason }}</p>
      </div>

      <!-- Refund / void form -->
      <form v-if="mode !== 'view'" @submit.prevent="confirm" class="mx-6 mb-4 space-y-3">
        <label for="status-reason" class="block text-xs font-semibold text-slate-700">
          {{ mode === 'refund' ? 'Why is this being refunded?' : 'Why is this being voided?' }} <span class="text-red-400">*</span>
        </label>
        <textarea id="status-reason" v-model="reason" rows="2" maxlength="300" required
          :placeholder="mode === 'refund' ? 'e.g. Service cancelled, patient was charged twice' : 'e.g. Wrong amount typed, wrong patient'"
          class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"></textarea>
        <p class="text-[11px] text-slate-400">
          {{ mode === 'refund'
            ? 'The payment stays on record as refunded and is taken out of your net revenue. Hand the money back separately.'
            : 'A voided payment is treated as if it was never entered. It stays on record with your reason.' }}
        </p>
        <p v-if="error" role="alert" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ error }}</p>
        <div class="flex gap-2">
          <button type="button" @click="cancel" :disabled="busy"
            class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors">Back</button>
          <button type="submit" :disabled="busy || reason.trim().length < 3"
            class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {{ busy ? 'Saving…' : mode === 'refund' ? 'Confirm refund' : 'Confirm void' }}
          </button>
        </div>
      </form>

      <!-- Actions -->
      <div v-else class="px-6 pb-6 flex flex-wrap gap-2">
        <button type="button" @click="print"
          class="flex-1 min-w-[8rem] flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          <span class="material-icons text-[16px]">print</span>Print receipt
        </button>
        <button v-if="canRefund" type="button" @click="mode = 'refund'"
          class="flex-1 min-w-[6rem] bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold py-2.5 rounded-xl text-sm transition-colors">Refund</button>
        <button v-if="canVoid" type="button" @click="mode = 'void'"
          class="flex-1 min-w-[6rem] bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-sm transition-colors">Void</button>
        <p v-if="payment.status === 'paid' && !canRefund && !canVoid" class="w-full text-[11px] text-slate-400 text-center">
          Only an admin can refund or void this payment.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { paymentService, type PaymentWithDetails } from '@/services/payment.service'
import { parseDbTimestamp } from '@/utils/billing'
import { formatMoney, manilaDateTimeLabel, methodMeta, STATUS_META } from '@/utils/revenue'
import { printReceipt } from '@/utils/receipt'

const props = defineProps<{ payment: PaymentWithDetails }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'changed'): void
}>()

const auth = useAuthStore()
const branchStore = useBranchStore()

const mode = ref<'view' | 'refund' | 'void'>('view')
const reason = ref('')
const busy = ref(false)
const error = ref('')

const status = computed(() => STATUS_META[props.payment.status] ?? STATUS_META.paid)
const method = computed(() => methodMeta(props.payment.payment_method))
const forWhat = computed(() => props.payment.description || props.payment.appointments?.service_name || '')

// Same rules as the database: admins refund; admins void any time, the recorder within 15 minutes
const canRefund = computed(() => auth.isAdmin && props.payment.status === 'paid')
const canVoid = computed(() => {
  if (!['paid', 'pending'].includes(props.payment.status)) return false
  if (auth.isAdmin) return true
  const age = Date.now() - parseDbTimestamp(props.payment.created_at).getTime()
  return props.payment.recorded_by === auth.user?.id && age < 15 * 60_000
})

function cancel() {
  mode.value = 'view'
  reason.value = ''
  error.value = ''
}

async function confirm() {
  if (busy.value || reason.value.trim().length < 3) return
  busy.value = true
  error.value = ''
  const result = mode.value === 'refund'
    ? await paymentService.refund(props.payment.id, reason.value.trim())
    : await paymentService.void(props.payment.id, reason.value.trim())
  busy.value = false

  if (result.error) {
    error.value = result.error
    return
  }
  emit('changed')
}

function print() {
  const p = props.payment
  const branch = branchStore.branches.find(b => b.id === p.branch_id)
  printReceipt({
    clinicName: auth.clinic?.name ?? 'Clinic',
    branchName: branch?.name ?? null,
    address: branch?.address ?? null,
    phone: branch?.contact_number ?? null,
    receiptNumber: p.receipt_number ?? '—',
    paidAt: p.paid_at,
    patientName: p.patients?.full_name ?? 'Unknown',
    description: forWhat.value || null,
    method: p.payment_method,
    reference: p.reference,
    amount: Number(p.amount),
    status: p.status,
    statusReason: p.status_reason,
    recordedBy: p.recorder?.full_name ?? null,
  })
}
</script>
