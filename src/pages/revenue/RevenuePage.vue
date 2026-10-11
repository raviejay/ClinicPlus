<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Revenue</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ rangeText }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" @click="exportExcel" :disabled="exporting || loading"
            class="hidden sm:flex items-center gap-1.5 bg-white border border-gray-200 hover:border-sky-300 text-slate-600 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
            <span class="material-icons text-[18px]">download</span>{{ exporting ? 'Preparing…' : 'Export' }}
          </button>
          <RouterLink to="/revenue/record"
            class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
            <span class="material-icons text-[18px]">add</span>Record
          </RouterLink>
        </div>
      </div>

      <FeatureGate feature="revenue" label="Revenue Tracking" required-plan="Pro or Premium">
        <div class="space-y-4">

          <!-- Period -->
          <div>
            <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Period">
              <button v-for="opt in RANGE_OPTIONS" :key="opt.key" type="button" @click="rangeKey = opt.key"
                :aria-pressed="rangeKey === opt.key"
                :class="['px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors',
                  rangeKey === opt.key ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-200']">
                {{ opt.label }}
              </button>
              <button type="button" @click="rangeKey = 'custom'" :aria-pressed="rangeKey === 'custom'"
                :class="['px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1',
                  rangeKey === 'custom' ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-200']">
                <span class="material-icons text-[14px]">date_range</span>Custom
              </button>
            </div>
            <div v-if="rangeKey === 'custom'" class="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <label class="flex items-center gap-1.5 text-slate-500">From
                <input v-model="custom.from" type="date" :max="today"
                  class="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200" /></label>
              <label class="flex items-center gap-1.5 text-slate-500">To
                <input v-model="custom.to" type="date" :max="today"
                  class="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200" /></label>
              <span v-if="!customValid" role="alert" class="text-red-500 font-semibold">Pick a valid range (up to about 2 years).</span>
            </div>
          </div>

          <div v-if="error" role="alert" class="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            <span class="material-icons text-[18px]">error_outline</span>{{ error }}
            <button type="button" @click="load" class="ml-auto font-bold underline">Retry</button>
          </div>

          <!-- To collect -->
          <UnpaidList v-if="unpaid.length" :items="unpaid" :busy-id="noChargeBusy" @no-charge="markNoCharge" />

          <div v-if="loading && !report" class="flex items-center justify-center py-12" aria-busy="true">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <template v-else-if="report">
            <!-- KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" :class="loading && 'opacity-60 transition-opacity'">
              <div class="col-span-2 bg-slate-900 rounded-2xl p-5 text-white">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Net revenue</p>
                <p class="text-3xl sm:text-4xl font-black tracking-tight">₱{{ formatMoney(report.totals.net) }}</p>
                <p class="text-xs mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span v-if="change !== null" :class="['font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5',
                    change >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300']">
                    <span class="material-icons text-[14px]">{{ change >= 0 ? 'trending_up' : 'trending_down' }}</span>{{ Math.abs(change) }}%
                  </span>
                  <span v-else-if="report.totals.net > 0" class="font-bold px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300">New</span>
                  <span class="text-slate-400">vs previous {{ previousLabel }} (₱{{ formatMoney(previous?.totals.net ?? 0) }})</span>
                </p>
              </div>
              <div class="bg-white border border-gray-200 rounded-2xl p-4">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Payments</p>
                <p class="text-2xl font-black text-slate-900">{{ report.totals.count.toLocaleString('en-PH') }}</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ report.totals.patients }} patient{{ report.totals.patients === 1 ? '' : 's' }}</p>
              </div>
              <div class="bg-white border border-gray-200 rounded-2xl p-4">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Average</p>
                <p class="text-2xl font-black text-slate-900">₱{{ formatMoney(report.totals.average) }}</p>
                <p class="text-xs mt-0.5" :class="report.refunds.count ? 'text-amber-600 font-semibold' : 'text-slate-400'">
                  {{ report.refunds.count ? `₱${formatMoney(report.refunds.amount)} refunded` : 'per payment' }}
                </p>
              </div>
            </div>

            <!-- Trend -->
            <section v-if="rangeLengthDays > 1" class="bg-white border border-gray-200 rounded-2xl p-4" :class="loading && 'opacity-60'">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Daily revenue</h2>
                <span v-if="bestDay" class="text-xs text-slate-400">Best day: <span class="font-bold text-slate-700">{{ dayLabel(bestDay.date) }}</span> · ₱{{ formatMoney(bestDay.amount) }}</span>
              </div>
              <RevenueTrendChart :daily="chartDaily" :previous="chartPrevious" />
            </section>

            <!-- Breakdowns -->
            <div v-if="report.totals.net > 0" class="grid md:grid-cols-2 gap-3">
              <section class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">By payment method</h2>
                <div v-for="m in report.by_method" :key="m.method" class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="flex items-center gap-1.5 font-medium text-slate-700">{{ methodMeta(m.method).icon }} {{ methodMeta(m.method).label }}
                      <span class="text-slate-400">· {{ m.count }}</span></span>
                    <span class="font-bold text-slate-900">₱{{ formatMoney(m.amount) }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                      :style="{ width: share(m.amount) + '%', background: methodMeta(m.method).color }"></div>
                  </div>
                </div>
              </section>

              <section class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">By service</h2>
                <div v-for="s in report.by_service.slice(0, 6)" :key="s.service" class="space-y-1">
                  <div class="flex items-center justify-between text-xs gap-3">
                    <span class="font-medium text-slate-700 truncate">{{ s.service }} <span class="text-slate-400">· {{ s.count }}</span></span>
                    <span class="font-bold text-slate-900 shrink-0">₱{{ formatMoney(s.amount) }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-sky-500 transition-all duration-500" :style="{ width: share(s.amount) + '%' }"></div>
                  </div>
                </div>
                <p v-if="report.by_service.length > 6" class="text-[11px] text-slate-400">+ {{ report.by_service.length - 6 }} more in the export</p>
              </section>

              <section v-if="report.by_doctor.length > 1 || (report.by_doctor[0] && report.by_doctor[0].doctor_id)"
                class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">By doctor</h2>
                <div v-for="d in report.by_doctor.slice(0, 6)" :key="d.doctor_id ?? 'none'" class="space-y-1">
                  <div class="flex items-center justify-between text-xs gap-3">
                    <span class="font-medium truncate" :class="d.doctor_id ? 'text-slate-700' : 'text-slate-400 italic'">
                      {{ d.doctor_id ? 'Dr. ' + d.name : d.name }} <span class="text-slate-400 not-italic">· {{ d.count }}</span></span>
                    <span class="font-bold text-slate-900 shrink-0">₱{{ formatMoney(d.amount) }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-violet-500 transition-all duration-500" :style="{ width: share(d.amount) + '%' }"></div>
                  </div>
                </div>
                <p class="text-[11px] text-slate-400">Doctors are known when a payment is linked to a visit.</p>
              </section>

              <section v-if="report.by_branch.length > 1" class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">By branch</h2>
                <div v-for="b in report.by_branch" :key="b.branch_id ?? 'main'" class="space-y-1">
                  <div class="flex items-center justify-between text-xs gap-3">
                    <span class="font-medium text-slate-700 truncate">{{ b.name }} <span class="text-slate-400">· {{ b.count }}</span></span>
                    <span class="font-bold text-slate-900 shrink-0">₱{{ formatMoney(b.amount) }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" :style="{ width: share(b.amount) + '%' }"></div>
                  </div>
                </div>
              </section>
            </div>

            <!-- Transactions -->
            <section>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div class="flex items-center gap-2">
                  <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Transactions</h2>
                  <button v-if="canCloseDay" type="button" @click="showClose = true"
                    class="text-[11px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                    <span class="material-icons text-[13px]">price_check</span>End of day
                  </button>
                </div>
                <div class="flex items-center gap-2 flex-1 sm:max-w-md sm:justify-end">
                  <div class="flex gap-1" role="group" aria-label="Status">
                    <button v-for="f in statusFilters" :key="f.key" type="button" @click="statusFilter = f.key" :aria-pressed="statusFilter === f.key"
                      :class="['px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                        statusFilter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-500 hover:border-slate-300']">
                      {{ f.label }}<span v-if="f.count" class="opacity-60"> {{ f.count }}</span>
                    </button>
                  </div>
                  <div class="relative flex-1 min-w-0">
                    <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input v-model="search" type="search" placeholder="Patient, receipt, reference…" aria-label="Search transactions"
                      class="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              <div v-if="payments.length === 0" class="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <div class="text-2xl mb-2">💰</div>
                <p class="text-sm font-semibold text-slate-600">No payments in this period</p>
                <p class="text-xs text-slate-400 mt-1">Recorded payments will appear here</p>
              </div>
              <div v-else-if="groups.length === 0" class="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-slate-500">
                No transactions match
              </div>

              <div v-else class="space-y-4">
                <div v-for="group in groups" :key="group.date">
                  <div class="flex items-center justify-between px-1 mb-1.5">
                    <p class="text-xs font-bold text-slate-500">{{ group.label }}</p>
                    <p class="text-xs font-bold text-slate-500">₱{{ formatMoney(group.total) }}</p>
                  </div>
                  <ul class="space-y-2">
                    <li v-for="p in group.items" :key="p.id">
                      <button type="button" @click="selected = p"
                        class="w-full text-left bg-white border border-gray-200 hover:border-sky-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-colors">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                            :style="{ background: methodMeta(p.payment_method).color + '20' }">{{ methodMeta(p.payment_method).icon }}</div>
                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-slate-900 truncate">{{ p.patients?.full_name ?? 'Unknown' }}</p>
                            <p class="text-xs text-slate-400 truncate">
                              {{ methodMeta(p.payment_method).label }} · {{ manilaTimeLabel(p.paid_at) }}
                              <template v-if="p.description || p.appointments?.service_name"> · {{ p.description || p.appointments?.service_name }}</template>
                              <template v-if="p.receipt_number"> · {{ p.receipt_number }}</template>
                            </p>
                          </div>
                        </div>
                        <div class="text-right shrink-0">
                          <p class="text-sm font-black" :class="p.status === 'paid' ? 'text-green-600' : 'text-slate-300 line-through'">₱{{ formatMoney(p.amount) }}</p>
                          <span v-if="p.status !== 'paid'" class="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold" :class="STATUS_META[p.status]?.classes">
                            {{ STATUS_META[p.status]?.label ?? p.status }}</span>
                        </div>
                      </button>
                    </li>
                  </ul>
                </div>
                <p v-if="payments.length >= PAGE_LIMIT" class="text-center text-xs text-slate-400">
                  Showing the latest {{ PAGE_LIMIT }} payments. Narrow the period or export for everything.
                </p>
              </div>
            </section>
          </template>
        </div>
      </FeatureGate>
    </div>

    <PaymentDetailModal v-if="selected" :payment="selected" @close="selected = null" @changed="onChanged" />
    <DayCloseModal v-if="showClose" :date-label="rangeText" :payments="payments" @close="showClose = false" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { paymentService, type PaymentWithDetails, type RevenueReport, type UnpaidAppointment } from '@/services/payment.service'
import AppLayout from '@/layouts/AppLayout.vue'
import FeatureGate from '@/components/ui/FeatureGate.vue'
import RevenueTrendChart from './RevenueTrendChart.vue'
import PaymentDetailModal from './PaymentDetailModal.vue'
import DayCloseModal from './DayCloseModal.vue'
import UnpaidList from './UnpaidList.vue'
import { addDays, manilaToday } from '@/utils/booking'
import {
  RANGE_OPTIONS, STATUS_META, dayLabel, fillDaily, formatMoney, groupPaymentsByDay, isValidRange, manilaTimeLabel,
  methodMeta, percentChange, previousRange, rangeFor, rangeLabel, rangeLength, type DateRange, type RangeKey,
} from '@/utils/revenue'
import { exportRevenueToExcel } from '@/utils/revenueExport'

const PAGE_LIMIT = 500

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const today = manilaToday()
const rangeKey = ref<RangeKey>('today')
const custom = ref<DateRange>({ from: addDays(today, -6), to: today })
const range = computed(() => rangeFor(rangeKey.value, today, custom.value))
const customValid = computed(() => rangeKey.value !== 'custom' || isValidRange(custom.value))
const rangeText = computed(() => rangeLabel(range.value))
const rangeLengthDays = computed(() => rangeLength(range.value))
const previousLabel = computed(() => (rangeLengthDays.value === 1 ? 'day' : `${rangeLengthDays.value} days`))

const loading = ref(true)
const error = ref('')
const report = ref<RevenueReport | null>(null)
const previous = ref<RevenueReport | null>(null)
const payments = ref<PaymentWithDetails[]>([])
const unpaid = ref<UnpaidAppointment[]>([])
const noChargeBusy = ref<string | null>(null)
const selected = ref<PaymentWithDetails | null>(null)
const showClose = ref(false)
const exporting = ref(false)

const search = ref('')
const statusFilter = ref<'all' | 'paid' | 'refunded' | 'voided'>('all')

let loadRequest = 0
async function load() {
  const clinicId = authStore.clinic?.id
  if (!clinicId || !customValid.value) return
  const id = ++loadRequest
  loading.value = true
  error.value = ''

  const [current, before, list] = await Promise.all([
    paymentService.getReport(range.value),
    paymentService.getReport(previousRange(range.value)),
    paymentService.getRange(clinicId, range.value, PAGE_LIMIT),
  ])
  if (id !== loadRequest) return // a newer request replaced this one

  loading.value = false
  if (current.error || !current.data) {
    error.value = current.error ?? 'Could not load revenue.'
    return
  }
  report.value = current.data
  previous.value = before.data
  payments.value = list.data ?? []
}

async function loadUnpaid() {
  if (!authStore.clinic?.id) return
  const { data } = await paymentService.getUnpaid({ from: addDays(today, -30), to: today })
  unpaid.value = data ?? []
}

async function markNoCharge(appointmentId: string) {
  noChargeBusy.value = appointmentId
  const { error: err } = await paymentService.markNoCharge(appointmentId)
  noChargeBusy.value = null
  if (err) {
    error.value = err
    return
  }
  unpaid.value = unpaid.value.filter(u => u.appointment_id !== appointmentId)
}

function onChanged() {
  selected.value = null
  load()
  loadUnpaid()
}

// ── Derived ──
const change = computed(() =>
  report.value && previous.value ? percentChange(report.value.totals.net, previous.value.totals.net) : null)

const chartDaily = computed(() => fillDaily(range.value, report.value?.daily ?? []))
const chartPrevious = computed(() =>
  previous.value ? fillDaily(previousRange(range.value), previous.value.daily).map(d => d.amount) : undefined)
const bestDay = computed(() => {
  const best = chartDaily.value.reduce((a, b) => (b.amount > a.amount ? b : a), { date: '', amount: 0 })
  return best.amount > 0 ? best : null
})

const share = (amount: number) => (report.value && report.value.totals.net > 0 ? Math.min(100, (amount / report.value.totals.net) * 100) : 0)

const statusFilters = computed(() => {
  const count = (s: string) => payments.value.filter(p => p.status === s).length
  return [
    { key: 'all' as const, label: 'All', count: 0 },
    { key: 'paid' as const, label: 'Paid', count: 0 },
    { key: 'refunded' as const, label: 'Refunded', count: count('refunded') },
    { key: 'voided' as const, label: 'Voided', count: count('voided') },
  ]
})

const visiblePayments = computed(() => {
  const q = search.value.trim().toLowerCase()
  return payments.value.filter(p => {
    // "All" shows what counts plus refunds; voided entries are tucked away unless asked for
    if (statusFilter.value === 'all' ? p.status === 'voided' : p.status !== statusFilter.value) return false
    if (!q) return true
    return [p.patients?.full_name, p.receipt_number, p.reference, p.description, p.appointments?.service_name, methodMeta(p.payment_method).label]
      .some(v => v?.toLowerCase().includes(q))
  })
})
const groups = computed(() => groupPaymentsByDay(visiblePayments.value))

const canCloseDay = computed(() => rangeLengthDays.value === 1 && payments.value.length > 0)

async function exportExcel() {
  if (!authStore.clinic?.id || exporting.value) return
  exporting.value = true
  const { data } = await paymentService.getRange(authStore.clinic.id, range.value, 5000)
  exporting.value = false
  exportRevenueToExcel({
    clinicName: authStore.clinic.name,
    range: range.value,
    report: report.value,
    payments: data ?? payments.value,
  })
}

watch([rangeKey, custom], () => { search.value = ''; load() }, { deep: true })

onMounted(() => {
  load()
  loadUnpaid()
  watchBranchChange(() => { load(); loadUnpaid() })
})
</script>
