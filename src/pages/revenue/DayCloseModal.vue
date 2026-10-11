<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
    role="dialog" aria-modal="true" aria-labelledby="close-title" @click.self="$emit('close')">
    <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
      <div class="p-6 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="close-title" class="text-lg font-black text-slate-900">End-of-day summary</h2>
          <p class="text-xs text-slate-400">{{ dateLabel }}</p>
        </div>
        <button type="button" @click="$emit('close')" aria-label="Close"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
          <span class="material-icons text-[18px]">close</span>
        </button>
      </div>

      <div class="px-6 space-y-4 pb-6">
        <div class="bg-slate-900 text-white rounded-2xl p-4">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Net revenue</p>
          <p class="text-3xl font-black">₱{{ formatMoney(net) }}</p>
          <p class="text-xs text-slate-400">{{ paidCount }} payment{{ paidCount === 1 ? '' : 's' }}</p>
        </div>

        <ul class="divide-y divide-gray-100 text-sm">
          <li v-for="m in methods" :key="m.key" class="flex items-center justify-between py-2">
            <span class="flex items-center gap-2 text-slate-700">{{ m.icon }} {{ m.label }}
              <span class="text-xs text-slate-400">({{ m.count }})</span></span>
            <span class="font-bold text-slate-900">₱{{ formatMoney(m.amount) }}</span>
          </li>
          <li v-if="methods.length === 0" class="py-3 text-center text-slate-400 text-xs">No payments this day</li>
        </ul>

        <p v-if="refunds.count || voidedCount" class="text-xs text-slate-500 bg-slate-50 border border-gray-200 rounded-lg px-3 py-2">
          <template v-if="refunds.count">Refunded ₱{{ formatMoney(refunds.amount) }} ({{ refunds.count }}). </template>
          <template v-if="voidedCount">{{ voidedCount }} voided entr{{ voidedCount === 1 ? 'y' : 'ies' }} not counted.</template>
        </p>

        <!-- Cash drawer -->
        <div class="border border-gray-200 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-500">Cash expected in drawer</span>
            <span class="font-bold text-slate-900">₱{{ formatMoney(cashExpected) }}</span>
          </div>
          <div>
            <label for="cash-counted" class="block text-xs font-semibold text-slate-700 mb-1.5">Cash counted (₱)</label>
            <input id="cash-counted" v-model="counted" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"
              class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <p v-if="countedNumber !== null" role="status" class="text-sm font-bold rounded-lg px-3 py-2"
            :class="variance === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
            {{ varianceText }}
          </p>
        </div>

        <button type="button" @click="print"
          class="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          <span class="material-icons text-[16px]">print</span>Print summary
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import type { PaymentWithDetails } from '@/services/payment.service'
import { formatMoney, METHODS, methodMeta } from '@/utils/revenue'
import { buildDayCloseHtml, printHtmlDocument } from '@/utils/receipt'

const props = defineProps<{
  /** Label for the day, e.g. "Monday, October 12, 2026" */
  dateLabel: string
  /** Every payment recorded that day (any status) */
  payments: PaymentWithDetails[]
}>()
defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()
const branchStore = useBranchStore()
const counted = ref<string | number>('')

const paid = computed(() => props.payments.filter(p => p.status === 'paid'))
const net = computed(() => paid.value.reduce((s, p) => s + Number(p.amount), 0))
const paidCount = computed(() => paid.value.length)

const methods = computed(() =>
  (Object.keys(METHODS) as (keyof typeof METHODS)[])
    .map(key => {
      const rows = paid.value.filter(p => p.payment_method === key)
      return { key, ...methodMeta(key), amount: rows.reduce((s, p) => s + Number(p.amount), 0), count: rows.length }
    })
    .filter(m => m.count > 0))

const refunds = computed(() => {
  const rows = props.payments.filter(p => p.status === 'refunded')
  return { amount: rows.reduce((s, p) => s + Number(p.amount), 0), count: rows.length }
})
const voidedCount = computed(() => props.payments.filter(p => p.status === 'voided').length)
const cashExpected = computed(() => methods.value.find(m => m.key === 'cash')?.amount ?? 0)

const countedNumber = computed(() => {
  if (counted.value === '' || counted.value === null) return null
  const n = Number(counted.value)
  return Number.isFinite(n) && n >= 0 ? n : null
})
const variance = computed(() =>
  countedNumber.value === null ? null : Math.round((countedNumber.value - cashExpected.value) * 100) / 100)
const varianceText = computed(() => {
  if (variance.value === null) return ''
  if (variance.value === 0) return 'Balanced — the drawer matches'
  return `${variance.value > 0 ? 'Over' : 'Short'} by ₱${formatMoney(Math.abs(variance.value))}`
})

function print() {
  const branch = branchStore.activeBranch
  printHtmlDocument(buildDayCloseHtml({
    clinicName: auth.clinic?.name ?? 'Clinic',
    branchName: branchStore.isViewingAll ? null : branch?.name ?? null,
    dateLabel: props.dateLabel,
    methods: methods.value.map(m => ({ label: m.label, amount: m.amount, count: m.count })),
    net: net.value,
    paymentCount: paidCount.value,
    refunds: refunds.value,
    voidedCount: voidedCount.value,
    cashExpected: cashExpected.value,
    cashCounted: countedNumber.value,
    preparedBy: auth.profile?.full_name ?? null,
  }))
}
</script>
