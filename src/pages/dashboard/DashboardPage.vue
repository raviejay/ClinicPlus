<template>
  <AppLayout>
    <div class="space-y-6">

      <!-- Trial banner -->
      <TrialBanner />

      <!-- ── Page header ─────────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p class="text-sm text-slate-400 mt-0.5">
            Good {{ timeOfDay }}, <span class="font-semibold text-slate-600">{{ firstName }}</span>! Here's what's happening in your clinic today.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-600 shadow-sm">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="font-medium">{{ today }}</span>
          </div>
        </div>
      </div>

      <!-- ── Stat cards ──────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="card in statCards" :key="card.label"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow duration-200 relative overflow-hidden group">
          <!-- Accent blob -->
          <div :class="['absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity', card.blob]"></div>
          <div class="flex items-start justify-between mb-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-xl', card.bg]">
              {{ card.icon }}
            </div>
            <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', card.badgeBg, card.badgeText]">
              {{ card.trend }}
            </span>
          </div>
          <p class="text-2xl font-black text-slate-900 leading-none">{{ card.value }}</p>
          <p class="text-xs text-slate-400 mt-1 font-medium">{{ card.label }}</p>
          <!-- Micro sparkline bar -->
          <div class="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div :class="['h-full rounded-full transition-all duration-700', card.bar]" :style="{ width: card.barW }"></div>
          </div>
        </div>
      </div>

      <!-- ── Revenue Overview (70%) + Recent Appointments (30%) ───────── -->
      <div class="grid grid-cols-1 lg:grid-cols-10 gap-4">
        
        <!-- Revenue Overview - 70% width (7/10 columns) -->
        <div class="lg:col-span-7">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-bold text-slate-800">Revenue Overview</h2>
                <p class="text-xs text-slate-400">Today's income & weekly trends</p>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                  <span class="text-xs text-slate-600">Today</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span class="text-xs text-slate-600">This Week</span>
                </div>
                <RouterLink to="/revenue" class="text-xs font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-1">
                  Full Report
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </RouterLink>
              </div>
            </div>

            <!-- Big revenue display -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div class="lg:col-span-1">
                <div class="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-5">
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Today's Total</p>
                  <p class="text-3xl font-black text-slate-900">₱{{ stats.todayRevenue.toLocaleString() }}</p>
                  <p class="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    +12% from yesterday
                  </p>
                </div>
              </div>
              <div class="lg:col-span-3">
                <!-- Revenue chart -->
                <canvas ref="revenueChartCanvas" class="w-full h-40"></canvas>
              </div>
            </div>

            <!-- Payment methods and stats -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <!-- Payment breakdown -->
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Methods Breakdown</p>
                <div class="space-y-3">
                  <div v-for="method in paymentMethods" :key="method.label" class="space-y-1">
                    <div class="flex items-center justify-between text-sm">
                      <div class="flex items-center gap-2">
                        <div :class="['w-2.5 h-2.5 rounded-full', method.dot]"></div>
                        <span class="text-slate-700 font-medium">{{ method.label }}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-500">₱{{ method.amount.toLocaleString() }}</span>
                        <span class="font-bold text-slate-800">{{ method.pct }}%</span>
                      </div>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div :class="['h-full rounded-full transition-all duration-700', method.bar]"
                        :style="{ width: method.pct + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick stats -->
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Revenue Insights</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 rounded-xl p-3">
                    <p class="text-xs text-slate-500 mb-1">Average per day</p>
                    <p class="text-lg font-bold text-slate-800">₱19,840</p>
                    <p class="text-[10px] text-green-600 mt-1">↑ This week</p>
                  </div>
                  <div class="bg-slate-50 rounded-xl p-3">
                    <p class="text-xs text-slate-500 mb-1">Best performing day</p>
                    <p class="text-lg font-bold text-slate-800">Saturday</p>
                    <p class="text-[10px] text-slate-500 mt-1">₱27,800</p>
                  </div>
                  <div class="bg-slate-50 rounded-xl p-3">
                    <p class="text-xs text-slate-500 mb-1">Monthly projection</p>
                    <p class="text-lg font-bold text-slate-800">₱594K</p>
                    <p class="text-[10px] text-green-600 mt-1">↑ On track</p>
                  </div>
                  <div class="bg-slate-50 rounded-xl p-3">
                    <p class="text-xs text-slate-500 mb-1">Transaction count</p>
                    <p class="text-lg font-bold text-slate-800">247</p>
                    <p class="text-[10px] text-slate-500 mt-1">This week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Appointments - 30% width (3/10 columns) -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-bold text-slate-800">Recent Appointments</h2>
                <p class="text-xs text-slate-400">Today's scheduled visits</p>
              </div>
              <RouterLink to="/appointments" class="text-xs font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-1">
                View All
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </RouterLink>
            </div>
            <div class="space-y-2 max-h-[500px] overflow-y-auto">
              <div v-if="recentAppointments.length === 0" class="py-8 text-center">
                <div class="text-3xl mb-2">📅</div>
                <p class="text-sm text-slate-400">No appointments today</p>
              </div>
              <div v-for="appt in recentAppointments" :key="appt.time"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div class="w-12 text-xs font-bold text-slate-400 shrink-0">{{ appt.time }}</div>
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center text-sm font-bold text-sky-600 shrink-0">
                  {{ appt.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">{{ appt.name }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ appt.reason }} · {{ appt.doctor }}</p>
                </div>
                <span :class="[
                  'text-xs font-bold px-2 py-1 rounded-full shrink-0',
                  appt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  appt.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                ]">{{ appt.status }}</span>
              </div>
            </div>
            
            <!-- Quick add appointment button -->
            <RouterLink to="/appointments/new"
              class="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-sky-200 text-sky-500 text-xs font-semibold hover:bg-sky-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Appointment
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- ── Quick actions ───────────────────────────────────────── -->
      <div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to"
            class="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:border-sky-200 hover:shadow-md transition-all duration-200 group shadow-sm">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-xl', action.bg]">
              {{ action.icon }}
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors leading-tight">{{ action.label }}</p>
              <p class="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{{ action.desc }}</p>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- ── Clinic info + Plan features (side by side on lg) ────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Clinic info -->
        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Your Clinic</h2>
              <p class="text-xs text-slate-400">Current configuration</p>
            </div>
            <RouterLink to="/admin/settings" class="text-xs text-sky-500 hover:text-sky-600 font-semibold">
              Edit settings →
            </RouterLink>
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <span class="text-xs text-slate-400 font-medium">Name</span>
              <span class="text-xs font-bold text-slate-700">{{ authStore.clinic?.name }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <span class="text-xs text-slate-400 font-medium">Booking URL</span>
              <a :href="`/book/${authStore.clinic?.slug}`" target="_blank"
                class="text-xs font-mono text-sky-500 hover:text-sky-600 truncate max-w-[160px]">
                /book/{{ authStore.clinic?.slug }}
              </a>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <span class="text-xs text-slate-400 font-medium">Booking mode</span>
              <span class="text-xs font-bold text-slate-700 capitalize">
                {{ authStore.clinicSettings?.booking_mode?.replace('_', ' ') }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2">
              <span class="text-xs text-slate-400 font-medium">Queue</span>
              <span :class="['text-xs font-bold', authStore.clinicSettings?.queue_enabled ? 'text-green-600' : 'text-slate-400']">
                {{ authStore.clinicSettings?.queue_enabled ? '● Enabled' : '○ Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Plan features -->
        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-sm font-bold text-slate-800">Plan Features</h2>
            <p class="text-xs text-slate-400">What's available on your current plan</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="feat in planFeatures" :key="feat.key"
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors',
                canUseFeature(feat.key)
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-slate-50 border-gray-200 text-slate-400'
              ]">
              <svg v-if="canUseFeature(feat.key)" class="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span class="truncate">{{ feat.label }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import TrialBanner from '@/components/ui/TrialBanner.vue'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'
import { queueService } from '@/services/queue.service'
import { paymentService } from '@/services/payment.service'
import { Chart, registerables } from 'chart.js'

// Register Chart.js components
Chart.register(...registerables)

const authStore = useAuthStore()
const { canUseFeature } = useClinic()

const stats = ref({ patients: 0, todayAppointments: 0, queueToday: 0, todayRevenue: 0 })

// Chart ref
const revenueChartCanvas = ref<HTMLCanvasElement | null>(null)
let revenueChart: Chart | null = null

// Sample weekly revenue data - replace with real data from API
const weeklyRevenueData = ref([12500, 18900, 15700, 22400, 19200, 27800, 16700])

// Initialize revenue chart
function initRevenueChart() {
  if (!revenueChartCanvas.value) return
  
  if (revenueChart) {
    revenueChart.destroy()
  }
  
  const ctx = revenueChartCanvas.value.getContext('2d')
  if (!ctx) return
  
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Revenue (₱)',
        data: weeklyRevenueData.value,
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(14, 165, 233)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Revenue: ₱${context.parsed.y.toLocaleString()}`
            }
          },
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return `₱${value / 1000}k`
            },
            font: {
              size: 10
            }
          },
          grid: {
            display: true,
            drawBorder: false,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  })
}

// Update chart when data changes
watch(weeklyRevenueData, () => {
  if (revenueChart) {
    revenueChart.data.datasets[0].data = weeklyRevenueData.value
    revenueChart.update()
  }
})

onMounted(async () => {
  if (!authStore.clinic?.id) return
  const today = new Date().toISOString().split('T')[0]
  const [patientCount, apptCount, queueCount, revSummary] = await Promise.all([
    patientService.getCount(authStore.clinic.id),
    appointmentService.getTodayCount(authStore.clinic.id),
    queueService.getWaitingCount(authStore.clinic.id),
    paymentService.getSummary(authStore.clinic.id, today),
  ])
  stats.value.patients = patientCount
  stats.value.todayAppointments = apptCount
  stats.value.queueToday = queueCount
  stats.value.todayRevenue = revSummary.total
  
  // Initialize chart after DOM is ready
  setTimeout(() => {
    initRevenueChart()
  }, 100)
})

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})

const today = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const firstName = computed(() => {
  const name = authStore.profile?.full_name ?? authStore.user?.email ?? 'Admin'
  return name.split(' ')[0]
})

const statCards = computed(() => [
  {
    icon: '👥', label: "Today's Appointments", value: stats.value.todayAppointments,
    trend: '+12%', bg: 'bg-sky-50', blob: 'bg-sky-400', bar: 'bg-sky-400', barW: '72%',
    badgeBg: 'bg-sky-50', badgeText: 'text-sky-600',
  },
  {
    icon: '🧑‍⚕️', label: 'Patients in Queue', value: stats.value.queueToday,
    trend: 'Live', bg: 'bg-green-50', blob: 'bg-green-400', bar: 'bg-green-400', barW: '45%',
    badgeBg: 'bg-green-50', badgeText: 'text-green-600',
  },
  {
    icon: '💊', label: 'Total Patients', value: stats.value.patients,
    trend: 'All time', bg: 'bg-purple-50', blob: 'bg-purple-400', bar: 'bg-purple-400', barW: '60%',
    badgeBg: 'bg-purple-50', badgeText: 'text-purple-600',
  },
  {
    icon: '₱', label: "Today's Revenue", value: '₱' + stats.value.todayRevenue.toLocaleString(),
    trend: '+8%', bg: 'bg-amber-50', blob: 'bg-amber-400', bar: 'bg-amber-400', barW: '53%',
    badgeBg: 'bg-amber-50', badgeText: 'text-amber-600',
  },
])

// Placeholder recent appointments — replace with real data
const recentAppointments = ref([
  { time: '09:00 AM', name: 'Juan Dela Cruz', reason: 'General Consultation', doctor: 'Dr. Ana Reyes',  status: 'Completed' },
  { time: '09:30 AM', name: 'Maria Santos',   reason: 'Dental Check-up',      doctor: 'Dr. Ana Reyes',  status: 'In Progress' },
  { time: '10:00 AM', name: 'Pedro Reyes',    reason: 'Follow-up Check',      doctor: 'Dr. Jose Tan',   status: 'Waiting' },
  { time: '10:30 AM', name: 'Liza Garcia',    reason: 'Flu Symptoms',         doctor: 'Dr. Ana Reyes',  status: 'Waiting' },
  { time: '11:00 AM', name: 'Mike Rodriguez', reason: 'Vaccination',          doctor: 'Dr. Jose Tan',   status: 'Scheduled' },
  { time: '01:00 PM', name: 'Anna Santos',    reason: 'Physical Exam',        doctor: 'Dr. Ana Reyes',  status: 'Scheduled' },
])

const paymentMethods = computed(() => {
  const total = stats.value.todayRevenue
  const cashAmount = total * 0.53
  const gcashAmount = total * 0.29
  const cardAmount = total * 0.12
  const otherAmount = total * 0.06
  
  return [
    { label: 'Cash',  dot: 'bg-green-400',  bar: 'bg-green-400',  pct: 53, amount: cashAmount },
    { label: 'GCash', dot: 'bg-sky-400',    bar: 'bg-sky-400',    pct: 29, amount: gcashAmount },
    { label: 'Card',  dot: 'bg-purple-400', bar: 'bg-purple-400', pct: 12, amount: cardAmount },
    { label: 'Other', dot: 'bg-amber-400',  bar: 'bg-amber-400',  pct: 6,  amount: otherAmount },
  ]
})

const quickActions = [
  { to: '/appointments/new', icon: '📅', label: 'New Appointment',   desc: 'Schedule a visit',    bg: 'bg-sky-50' },
  { to: '/patients/new',     icon: '➕', label: 'Add Walk-in',       desc: 'Register patient',    bg: 'bg-green-50' },
  { to: '/queue',            icon: '▶️', label: 'Start Queue',       desc: "Today's flow",        bg: 'bg-amber-50' },
  { to: '/revenue/new',      icon: '💳', label: 'Record Payment',    desc: 'Log transaction',     bg: 'bg-purple-50' },
  { to: '/records/new',      icon: '📋', label: 'Medical Record',    desc: 'Add consultation',    bg: 'bg-rose-50' },
  { to: '/revenue/reports',  icon: '📊', label: 'View Reports',      desc: 'Analytics & exports', bg: 'bg-indigo-50' },
]

const planFeatures = [
  { key: 'queue',           label: 'Queue management' },
  { key: 'revenue',         label: 'Revenue tracking' },
  { key: 'sms',             label: 'SMS notifications' },
  { key: 'multi_branch',    label: 'Multi-branch' },
  { key: 'export',          label: 'Export reports' },
  { key: 'custom_branding', label: 'Custom branding' },
]
</script>