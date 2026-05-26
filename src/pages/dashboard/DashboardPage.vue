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
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-lg font-bold text-slate-800">Revenue Overview</h2>
                <p class="text-xs text-slate-400">Today's income & 7-day trend</p>
              </div>
              <RouterLink to="/revenue" class="text-xs font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-0.5">
                Full Report <span class="material-icons text-sm">chevron_right</span>
              </RouterLink>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
              <div class="lg:col-span-1">
                <div class="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 h-full flex flex-col justify-center">
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Today's Total</p>
                  <p class="text-2xl font-black text-slate-900">₱{{ stats.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ stats.todayPaymentCount }} transaction{{ stats.todayPaymentCount !== 1 ? 's' : '' }}</p>
                </div>
              </div>
              <div class="lg:col-span-3 h-36">
                <canvas ref="revenueChartCanvas" style="height:144px"></canvas>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-100">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Methods</p>
              <div v-if="paymentMethods.length === 0" class="text-xs text-slate-400 text-center py-3">
                No payments recorded today
              </div>
              <div v-else class="space-y-2.5">
                <div v-for="method in paymentMethods" :key="method.label" class="space-y-1">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div :class="['w-2 h-2 rounded-full', method.dot]"></div>
                      <span class="text-xs font-medium text-slate-700">{{ method.label }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-slate-500">₱{{ method.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                      <span class="text-xs font-bold text-slate-800 w-8 text-right">{{ method.pct }}%</span>
                    </div>
                  </div>
                  <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div :class="['h-full rounded-full transition-all duration-700', method.bar]" :style="{ width: method.pct + '%' }"></div>
                  </div>
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
  { label: 'SMS',          value: authStore.clinicSettings?.sms_enabled ? '● Enabled' : '○ Disabled',
    color: authStore.clinicSettings?.sms_enabled ? 'text-green-600' : 'text-slate-400' },
])

const quickActions = [
  { to: '/appointments/new',   icon: 'event_available', label: 'New Appointment', desc: 'Schedule a visit',    bg: 'bg-sky-50',    iconColor: 'text-sky-500' },
  { to: '/patients/new',       icon: 'person_add',      label: 'Add Walk-in',    desc: 'Register patient',    bg: 'bg-green-50',  iconColor: 'text-green-500' },
  { to: '/queue',              icon: 'play_circle',     label: 'Start Queue',    desc: "Today's flow",        bg: 'bg-amber-50',  iconColor: 'text-amber-500' },
  { to: '/revenue/record',     icon: 'point_of_sale',   label: 'Record Payment', desc: 'Log transaction',     bg: 'bg-purple-50', iconColor: 'text-purple-500' },
  { to: '/medical-records/new',icon: 'note_add',        label: 'Add Record',     desc: 'Add consultation',    bg: 'bg-rose-50',   iconColor: 'text-rose-500' },
  { to: '/revenue',            icon: 'bar_chart',       label: 'View Revenue',   desc: 'Analytics',           bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
]

const planFeatures = [
  { key: 'queue',           label: 'Queue management' },
  { key: 'revenue',         label: 'Revenue tracking' },
  { key: 'sms',             label: 'SMS notifications' },
  { key: 'multi_branch',    label: 'Multi-branch' },
  { key: 'export',          label: 'Export reports' },
  { key: 'custom_branding', label: 'Custom branding' },
]

function initChart(weeklyData: number[]) {
  if (!revenueChartCanvas.value) return
  if (revenueChart) revenueChart.destroy()
  const ctx = revenueChartCanvas.value.getContext('2d')
  if (!ctx) return

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: (() => {
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          return days[d.getDay()]
        })
      })(),
      datasets: [{
        label: 'Revenue (₱)',
        data: weeklyData,
        borderColor: 'rgb(14,165,233)',
        backgroundColor: 'rgba(14,165,233,0.08)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(14,165,233)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => `₱${c.parsed.y.toLocaleString()}` },
          backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
          padding: 10, cornerRadius: 8,
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => `₱${Number(v)/1000}k`, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  })
}

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

  stats.value.patients = patientCount
  stats.value.todayAppointments = apptCount
  stats.value.queueToday = queueCount
  stats.value.todayRevenue = revSummary.total
  stats.value.todayPaymentCount = revSummary.count
  stats.value.byMethod = revSummary.byMethod
  todayAppointments.value = (apptList.data as any) ?? []
  loadingAppts.value = false

  // Build real 7-day revenue
  const weeklyData: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const s = await paymentService.getSummary(clinicId, d.toISOString().split('T')[0])
    weeklyData.push(s.total)
  }
  setTimeout(() => initChart(weeklyData), 100)
}

onMounted(() => {
  loadStats()
  watchBranchChange(loadStats)
})
</script>