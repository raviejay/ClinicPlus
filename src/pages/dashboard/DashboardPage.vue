<template>
  <AppLayout>
    <div class="space-y-6">

      <TrialBanner />

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p class="text-sm text-slate-400 mt-0.5">
            Good {{ timeOfDay }}, <span class="font-semibold text-slate-600">{{ firstName }}</span>! Here's what's happening today.
          </p>
        </div>
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-600 shadow-sm w-fit">
          <span class="material-icons text-slate-400 text-base">calendar_today</span>
          <span class="font-medium">{{ today }}</span>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="card in statCards" :key="card.label"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow duration-200 relative overflow-hidden group">
          <div :class="['absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity', card.blob]"></div>
          <div class="flex items-start justify-between mb-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', card.bg]">
              <span :class="['material-icons text-xl', card.iconColor]">{{ card.icon }}</span>
            </div>
            <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', card.badgeBg, card.badgeText]">
              {{ card.trend }}
            </span>
          </div>
          <p class="text-2xl font-black text-slate-900 leading-none">{{ card.value }}</p>
          <p class="text-xs text-slate-400 mt-1 font-medium">{{ card.label }}</p>
          <div class="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div :class="['h-full rounded-full transition-all duration-700', card.bar]" :style="{ width: card.barW }"></div>
          </div>
        </div>
      </div>

      <!-- Revenue + Appointments -->
      <div class="grid grid-cols-1 lg:grid-cols-10 gap-4">

        <!-- Revenue Overview -->
        <div class="lg:col-span-7">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            <!-- Top header row -->
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2">
                <span class="material-icons text-amber-400 text-lg">monetization_on</span>
                <h2 class="text-sm font-bold text-slate-700">Revenue</h2>
              </div>
              <div class="flex items-center gap-3">
                <!-- Period toggle -->
                <div class="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                  <button v-for="p in ['7D','30D','90D','1Y']" :key="p"
                    @click="chartPeriod = p; reloadChart()"
                    :class="['px-2.5 py-1 rounded-md transition-all', chartPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600']">
                    {{ p }}
                  </button>
                </div>
                <RouterLink to="/revenue" class="text-xs font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-0.5">
                  Full Report <span class="material-icons text-sm">chevron_right</span>
                </RouterLink>
              </div>
            </div>

            <!-- Two-column body: left stat panel + right chart -->
            <div class="flex gap-5">

              <!-- Left stat panel -->
              <div class="w-40 shrink-0 flex flex-col gap-3">
                <!-- Total revenue -->
                <div>
                  <p class="text-2xl font-black text-slate-900 leading-none">
                    ₱{{ periodRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </p>
                  <div class="flex items-center gap-1 mt-1.5">
                    <span class="material-icons text-green-500 text-sm leading-none">arrow_upward</span>
                    <span class="text-sm font-bold text-green-500">{{ revenueChangePct }}%</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5">{{ periodLabel }}</p>
                </div>

                <!-- Best Day card -->
                <div class="bg-slate-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2.5 mt-1">
                  <span class="material-icons text-amber-400 text-2xl shrink-0">emoji_events</span>
                  <div>
                    <p class="text-[10px] text-slate-400 font-medium">Best Day</p>
                    <p class="text-xs font-bold text-slate-700 leading-tight">{{ bestDay.label }}</p>
                    <p class="text-xs font-black text-slate-900">₱{{ bestDay.amount.toLocaleString('en-PH') }}</p>
                  </div>
                </div>

                <!-- Payment Methods -->
                <div class="pt-3 border-t border-gray-100">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Methods</p>
                  <div v-if="paymentMethods.length === 0" class="text-xs text-slate-400 py-2">No payments today</div>
                  <div v-else class="space-y-2">
                    <div v-for="method in paymentMethods" :key="method.label" class="space-y-1">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <div :class="['w-1.5 h-1.5 rounded-full', method.dot]"></div>
                          <span class="text-[11px] font-medium text-slate-700">{{ method.label }}</span>
                        </div>
                        <span class="text-[11px] font-bold text-slate-800">{{ method.pct }}%</span>
                      </div>
                      <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div :class="['h-full rounded-full transition-all duration-700', method.bar]" :style="{ width: method.pct + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right chart area -->
              <div class="flex-1 min-w-0">
                <p class="text-[11px] text-slate-400 mb-1 font-medium">Revenue Amount (₱)</p>
                <div class="relative h-64">
                  <canvas ref="revenueChartCanvas"></canvas>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Today's Appointments -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-bold text-slate-800">Today's Appointments</h2>
                <p class="text-xs text-slate-400">{{ stats.todayAppointments }} scheduled</p>
              </div>
              <RouterLink to="/appointments" class="text-xs font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-0.5">
                All <span class="material-icons text-sm">chevron_right</span>
              </RouterLink>
            </div>

            <div class="flex-1 space-y-1 overflow-y-auto">
              <div v-if="loadingAppts" class="flex justify-center py-8">
                <div class="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div v-else-if="todayAppointments.length === 0" class="py-8 text-center">
                <span class="material-icons text-4xl text-slate-200">event_busy</span>
                <p class="text-sm text-slate-400 mt-2">No appointments today</p>
              </div>
              <div v-else v-for="appt in todayAppointments" :key="appt.id"
                class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div class="w-10 text-[10px] font-bold text-slate-400 shrink-0 text-center leading-tight">{{ appt.time_slot ?? '—' }}</div>
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center text-xs font-bold text-sky-600 shrink-0">
                  {{ (appt as any).patients?.full_name?.charAt(0) ?? '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800 truncate">{{ (appt as any).patients?.full_name ?? 'Unknown' }}</p>
                  <p class="text-[11px] text-slate-400 truncate">{{ appt.notes ?? 'Consultation' }}</p>
                </div>
                <span :class="[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                  appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                  appt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                ]">{{ appt.status }}</span>
              </div>
            </div>

            <RouterLink to="/appointments/new"
              class="mt-4 flex items-center justify-center gap-1 w-full py-2.5 rounded-xl border border-dashed border-sky-200 text-sky-500 text-xs font-semibold hover:bg-sky-50 transition-colors shrink-0">
              <span class="material-icons text-sm">add</span>
              New Appointment
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to"
            class="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:border-sky-200 hover:shadow-md transition-all duration-200 group shadow-sm">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', action.bg]">
              <span :class="['material-icons text-xl', action.iconColor]">{{ action.icon }}</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors leading-tight">{{ action.label }}</p>
              <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ action.desc }}</p>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Clinic info + Plan -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Your Clinic</h2>
              <p class="text-xs text-slate-400">Current configuration</p>
            </div>
            <RouterLink to="/admin/settings" class="text-xs text-sky-500 hover:text-sky-600 font-semibold flex items-center">
              Edit <span class="material-icons text-sm">arrow_forward</span>
            </RouterLink>
          </div>
          <div class="space-y-0">
            <div v-for="row in clinicInfo" :key="row.label"
              class="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span class="text-xs text-slate-400 font-medium">{{ row.label }}</span>
              <component :is="row.link ? 'a' : 'span'"
                v-bind="row.link ? { href: row.link, target: '_blank' } : {}"
                :class="['text-xs font-bold truncate max-w-[200px]', row.link ? 'text-sky-500 hover:text-sky-600 font-mono' : row.color ?? 'text-slate-700']">
                {{ row.value }}
              </component>
            </div>
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-sm font-bold text-slate-800">Plan Features</h2>
            <p class="text-xs text-slate-400">What's available on your plan</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="feat in planFeatures" :key="feat.key"
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium',
                canUseFeature(feat.key) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-gray-200 text-slate-400'
              ]">
              <span :class="['material-icons text-sm', canUseFeature(feat.key) ? 'text-green-500' : 'text-slate-300']">
                {{ canUseFeature(feat.key) ? 'check_circle' : 'lock' }}
              </span>
              <span class="truncate">{{ feat.label }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import TrialBanner from '@/components/ui/TrialBanner.vue'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import { queueService } from '@/services/queue.service'
import { paymentService } from '@/services/payment.service'
import { Chart, registerables } from 'chart.js'
import type { Appointment } from '@/types'

Chart.register(...registerables)

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()
const { canUseFeature } = useClinic()

const stats = ref({
  patients: 0, todayAppointments: 0, queueToday: 0,
  todayRevenue: 0, todayPaymentCount: 0,
  byMethod: { cash: 0, gcash: 0, maya: 0, card: 0, other: 0 },
})
const todayAppointments = ref<Appointment[]>([])
const loadingAppts = ref(true)
const revenueChartCanvas = ref<HTMLCanvasElement | null>(null)
let revenueChart: Chart | null = null
const chartPeriod = ref<'7D' | '30D' | '90D' | '1Y'>('30D')

// Cached daily revenue data (last 365 days) — reactive so computed deps update
const cachedDailyData = ref<{ date: string; total: number }[]>([])

// ── Derived stats ──────────────────────────────────────────────

const periodDays = computed(() => {
  if (chartPeriod.value === '7D') return 7
  if (chartPeriod.value === '30D') return 30
  if (chartPeriod.value === '90D') return 90
  return 365
})

const periodLabel = computed(() => {
  if (chartPeriod.value === '7D') return 'vs previous 7 days'
  if (chartPeriod.value === '30D') return 'vs last 30 days'
  if (chartPeriod.value === '90D') return 'vs previous 90 days'
  return 'vs previous year'
})

const periodSlice = computed(() => cachedDailyData.value.slice(-periodDays.value))
const prevSlice   = computed(() => cachedDailyData.value.slice(-periodDays.value * 2, -periodDays.value))

// periodRevenue is now fully derived — no manual sync needed
const periodRevenue = computed(() => periodSlice.value.reduce((s, d) => s + d.total, 0))

const revenueChangePct = computed(() => {
  const cur  = periodSlice.value.reduce((s, d) => s + d.total, 0)
  const prev = prevSlice.value.reduce((s, d) => s + d.total, 0)
  if (!prev) return '0.0'
  return (((cur - prev) / prev) * 100).toFixed(1)
})

const bestDay = computed(() => {
  const slice = periodSlice.value
  if (!slice.length) return { label: '—', amount: 0 }
  const top = slice.reduce((a, b) => b.total > a.total ? b : a)
  const d = new Date(top.date)
  const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  return { label, amount: top.total }
})

// ── Chart helpers ──────────────────────────────────────────────

function getChartDataForPeriod(period: '7D' | '30D' | '90D' | '1Y') {
  if (period === '1Y') {
    // Aggregate by month
    const months: Record<string, number> = {}
    cachedDailyData.value.forEach(d => {
      const key = d.date.slice(0, 7) // "YYYY-MM"
      months[key] = (months[key] ?? 0) + d.total
    })
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    return {
      labels: sorted.map(([k]) => {
        const [y, m] = k.split('-')
        return new Date(+y, +m - 1).toLocaleDateString('en-PH', { month: 'short' })
      }),
      data: sorted.map(([, v]) => v),
    }
  }

  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90
  const slice = cachedDailyData.value.slice(-days)

  if (period === '7D') {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    return {
      labels: slice.map(d => dayNames[new Date(d.date).getDay()]),
      data:   slice.map(d => d.total),
    }
  }

  return {
    labels: slice.map((d, i) => String(i + 1)),
    data:   slice.map(d => d.total),
  }
}

function reloadChart() {
  const { labels, data } = getChartDataForPeriod(chartPeriod.value)
  initChart(labels, data, chartPeriod.value)
}

function initChart(labels: string[], data: number[], period: '7D' | '30D' | '90D' | '1Y') {
  if (!revenueChartCanvas.value) return
  if (revenueChart) revenueChart.destroy()
  const ctx = revenueChartCanvas.value.getContext('2d')
  if (!ctx) return

  const gradient = ctx.createLinearGradient(0, 0, 0, 220)
  gradient.addColorStop(0, 'rgba(251,191,36,0.30)')
  gradient.addColorStop(1, 'rgba(251,191,36,0.00)')

  const maxVal = Math.max(...data)
  const maxIdx = data.indexOf(maxVal)

  const peakLabelPlugin = {
    id: 'peakLabel',
    afterDatasetsDraw(chart: Chart) {
      const meta = chart.getDatasetMeta(0)
      const pt   = meta.data[maxIdx]
      if (!pt) return
      const { x, y } = pt
      const c = chart.ctx
      const valText = `₱${Math.round(maxVal).toLocaleString('en-PH')}`
      const dayText = labels[maxIdx]
      const boxW = 82, boxH = 36, r = 6
      let bx = x - boxW / 2
      let by = y - boxH - 14
      if (bx < 4) bx = 4
      if (bx + boxW > chart.width - 4) bx = chart.width - boxW - 4
      if (by < 4) by = y + 14
      c.save()
      c.fillStyle = '#fff'
      c.strokeStyle = 'rgba(0,0,0,0.10)'
      c.lineWidth = 1
      c.beginPath()
      c.roundRect(bx, by, boxW, boxH, r)
      c.fill(); c.stroke()
      c.font = '10px system-ui, sans-serif'
      c.fillStyle = '#94a3b8'
      c.textAlign = 'center'
      c.fillText(dayText, bx + boxW / 2, by + 13)
      c.font = '600 12px system-ui, sans-serif'
      c.fillStyle = '#0f172a'
      c.fillText(valText, bx + boxW / 2, by + 28)
      c.restore()
    },
  }

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₱)',
        data,
        borderColor: 'rgb(251,191,36)',
        backgroundColor: gradient,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: data.map((_, i) => i === maxIdx ? 6 : 0),
        pointBackgroundColor: 'rgb(251,191,36)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(251,191,36)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30, right: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `  ₱${(c.parsed.y ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            title: (items) => `  ${items[0].label}`,
          },
          backgroundColor: '#0f172a',
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          bodyFont: { weight: 'bold', size: 13 },
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          caretSize: 6,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `₱${Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + 'k' : v}`,
            font: { size: 10 },
            color: '#94a3b8',
            maxTicksLimit: 5,
          },
          grid: { color: 'rgba(0,0,0,0.04)' },
          border: { display: false },
        },
        x: {
          ticks: {
            font: { size: 10 },
            color: '#94a3b8',
            maxTicksLimit: period === '90D' ? 9 : period === '1Y' ? 12 : 10,
            autoSkip: true,
            maxRotation: 0,
          },
          grid: { display: false },
          border: { display: false },
        },
      },
      interaction: { intersect: false, mode: 'index' },
    },
    plugins: [peakLabelPlugin],
  })
}

// ── Other computed ─────────────────────────────────────────────

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
})

const today = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const firstName = computed(() => {
  const name = authStore.profile?.full_name ?? authStore.user?.email ?? 'Admin'
  return name.split(' ')[0]
})

const statCards = computed(() => [
  { icon: 'calendar_month', label: "Today's Appointments", value: stats.value.todayAppointments,
    trend: 'Today', bg: 'bg-sky-50', blob: 'bg-sky-400', bar: 'bg-sky-400', barW: '72%',
    badgeBg: 'bg-sky-50', badgeText: 'text-sky-600', iconColor: 'text-sky-500' },
  { icon: 'queue', label: 'Patients Waiting', value: stats.value.queueToday,
    trend: 'Live', bg: 'bg-green-50', blob: 'bg-green-400', bar: 'bg-green-400', barW: '45%',
    badgeBg: 'bg-green-50', badgeText: 'text-green-600', iconColor: 'text-green-500' },
  { icon: 'group', label: 'Total Patients', value: stats.value.patients,
    trend: 'All time', bg: 'bg-purple-50', blob: 'bg-purple-400', bar: 'bg-purple-400', barW: '60%',
    badgeBg: 'bg-purple-50', badgeText: 'text-purple-600', iconColor: 'text-purple-500' },
  { icon: 'payments', label: "Today's Revenue",
    value: '₱' + stats.value.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
    trend: 'Today', bg: 'bg-amber-50', blob: 'bg-amber-400', bar: 'bg-amber-400', barW: '53%',
    badgeBg: 'bg-amber-50', badgeText: 'text-amber-600', iconColor: 'text-amber-500' },
])

const paymentMethods = computed(() => {
  const total = stats.value.todayRevenue || 1
  const b = stats.value.byMethod
  return [
    { label: 'Cash',  dot: 'bg-green-400',  bar: 'bg-green-400',  pct: Math.round((b.cash  / total) * 100), amount: b.cash  },
    { label: 'GCash', dot: 'bg-sky-400',    bar: 'bg-sky-400',    pct: Math.round((b.gcash / total) * 100), amount: b.gcash },
    { label: 'Maya',  dot: 'bg-purple-400', bar: 'bg-purple-400', pct: Math.round((b.maya  / total) * 100), amount: b.maya  },
    { label: 'Card',  dot: 'bg-amber-400',  bar: 'bg-amber-400',  pct: Math.round((b.card  / total) * 100), amount: b.card  },
    { label: 'Other', dot: 'bg-slate-400',  bar: 'bg-slate-400',  pct: Math.round((b.other / total) * 100), amount: b.other },
  ].filter(m => m.amount > 0)
})

const clinicInfo = computed(() => [
  { label: 'Name',         value: authStore.clinic?.name ?? '—' },
  { label: 'Booking URL',  value: `/book/${authStore.clinic?.slug}`, link: `/book/${authStore.clinic?.slug}` },
  { label: 'Booking mode', value: authStore.clinicSettings?.booking_mode?.replace(/_/g, ' ') ?? '—' },
  { label: 'Queue',        value: authStore.clinicSettings?.queue_enabled ? '● Enabled' : '○ Disabled',
    color: authStore.clinicSettings?.queue_enabled ? 'text-green-600' : 'text-slate-400' },
])

const quickActions = [
  { to: '/appointments/new',    icon: 'event_available', label: 'New Appointment', desc: 'Schedule a visit',  bg: 'bg-sky-50',    iconColor: 'text-sky-500' },
  { to: '/patients/new',        icon: 'person_add',      label: 'Add Walk-in',    desc: 'Register patient',  bg: 'bg-green-50',  iconColor: 'text-green-500' },
  { to: '/queue',               icon: 'play_circle',     label: 'Start Queue',    desc: "Today's flow",      bg: 'bg-amber-50',  iconColor: 'text-amber-500' },
  { to: '/revenue/record',      icon: 'point_of_sale',   label: 'Record Payment', desc: 'Log transaction',   bg: 'bg-purple-50', iconColor: 'text-purple-500' },
  { to: '/medical-records/new', icon: 'note_add',        label: 'Add Record',     desc: 'Add consultation',  bg: 'bg-rose-50',   iconColor: 'text-rose-500' },
  { to: '/revenue',             icon: 'bar_chart',       label: 'View Revenue',   desc: 'Analytics',         bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
]

const planFeatures = [
  { key: 'queue',               label: 'Queue management' },
  { key: 'revenue',             label: 'Revenue tracking' },
  { key: 'email_notifications', label: 'Email notifications' },
  { key: 'multi_branch',        label: 'Multi-branch' },
  { key: 'full_analytics',      label: 'Full analytics' },
  { key: 'custom_branding',     label: 'Custom branding' },
  { key: 'priority_support',    label: 'Priority support' },
]

// ── Data loading ───────────────────────────────────────────────

async function loadStats() {
  if (!authStore.clinic?.id) return
  const clinicId = authStore.clinic.id
  const todayDate = new Date().toISOString().split('T')[0]

  const [patientCount, apptCount, queueCount, revSummary, apptList] = await Promise.all([
    patientService.getCount(clinicId),
    appointmentService.getTodayCount(clinicId),
    queueService.getWaitingCount(clinicId),
    paymentService.getSummary(clinicId, todayDate),
    appointmentService.getToday(clinicId),
  ])

  stats.value.patients          = patientCount
  stats.value.todayAppointments = apptCount
  stats.value.queueToday        = queueCount
  stats.value.todayRevenue      = revSummary.total
  stats.value.todayPaymentCount = revSummary.count
  stats.value.byMethod          = revSummary.byMethod
  todayAppointments.value       = (apptList.data as any) ?? []
  loadingAppts.value            = false

  // Fetch last 365 days in parallel so all period views are available instantly
  const days365 = Array.from({ length: 365 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (364 - i))
    return d.toISOString().split('T')[0]
  })

  const results = await Promise.all(days365.map(date => paymentService.getSummary(clinicId, date)))
  cachedDailyData.value = days365.map((date, i) => ({ date, total: results[i].total }))

  // periodRevenue is now computed reactively — just render chart
  const { labels, data } = getChartDataForPeriod(chartPeriod.value)
  setTimeout(() => initChart(labels, data, chartPeriod.value), 100)
}

onMounted(() => {
  loadStats()
  watchBranchChange(loadStats)
})
</script>