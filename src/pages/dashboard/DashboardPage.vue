<template>
  <AppLayout>
    <div class="space-y-5">

      <!-- Trial banner -->
      <TrialBanner />

      <!-- Header -->
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">
          Good {{ timeOfDay }}, {{ firstName }} 👋
        </h1>
        <p class="text-sm text-slate-400 mt-0.5">{{ today }}</p>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Total patients" :value="stats.patients" icon-bg="bg-sky-50" />
        <StatCard icon="📅" label="Today's bookings" :value="stats.todayAppointments" icon-bg="bg-green-50" />
        <StatCard icon="⏱️" label="Queue today" :value="stats.queueToday" icon-bg="bg-amber-50" />
        <StatCard icon="💰" label="Today's revenue" :value="'₱' + stats.todayRevenue.toLocaleString()" icon-bg="bg-purple-50" />
      </div>

      <!-- Quick actions -->
      <div>
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick actions</p>
        <div class="grid grid-cols-2 gap-3">
          <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to"
            class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-sky-200 hover:shadow-sm transition-all group">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0', action.bg]">
              {{ action.icon }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">{{ action.label }}</p>
              <p class="text-xs text-slate-400 truncate">{{ action.desc }}</p>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Clinic info card -->
      <div class="bg-white border border-gray-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your clinic</p>
          <RouterLink to="/admin/settings" class="text-xs text-sky-500 hover:text-sky-600 font-medium">
            Edit settings
          </RouterLink>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">Name</span>
            <span class="text-xs font-semibold text-slate-700">{{ authStore.clinic?.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">Booking URL</span>
            <a :href="`/book/${authStore.clinic?.slug}`" target="_blank"
              class="text-xs font-mono text-sky-500 hover:text-sky-600 truncate max-w-[180px]">
              /book/{{ authStore.clinic?.slug }}
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">Booking mode</span>
            <span class="text-xs font-semibold text-slate-700 capitalize">
              {{ authStore.clinicSettings?.booking_mode?.replace('_', ' ') }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">Queue</span>
            <span :class="['text-xs font-semibold', authStore.clinicSettings?.queue_enabled ? 'text-green-600' : 'text-slate-400']">
              {{ authStore.clinicSettings?.queue_enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Feature availability -->
      <div class="bg-white border border-gray-200 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Plan features</p>
        <div class="space-y-2">
          <div v-for="feat in planFeatures" :key="feat.key" class="flex items-center justify-between">
            <span class="text-xs text-slate-600">{{ feat.label }}</span>
            <span :class="['text-xs font-semibold', canUseFeature(feat.key) ? 'text-green-600' : 'text-slate-300']">
              {{ canUseFeature(feat.key) ? '✓ Available' : '✗ Upgrade' }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import TrialBanner from '@/components/ui/TrialBanner.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { patientService } from '@/services/patient.service'
import { appointmentService } from '@/services/appointment.service'

const authStore = useAuthStore()
const { canUseFeature } = useClinic()

const stats = ref({ patients: 0, todayAppointments: 0, queueToday: 0, todayRevenue: 0 })

onMounted(async () => {
  if (!authStore.clinic?.id) return
  const [patientCount, apptCount] = await Promise.all([
    patientService.getCount(authStore.clinic.id),
    appointmentService.getTodayCount(authStore.clinic.id),
  ])
  stats.value.patients = patientCount
  stats.value.todayAppointments = apptCount
})

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})

const today = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)

const firstName = computed(() => {
  const name = authStore.profile?.full_name ?? authStore.user?.email ?? 'Admin'
  return name.split(' ')[0]
})

const quickActions = [
  { to: '/patients/new',     icon: '➕', label: 'New patient',     desc: 'Add walk-in or register', bg: 'bg-sky-50' },
  { to: '/appointments/new', icon: '📅', label: 'Book appointment', desc: 'Schedule a visit',         bg: 'bg-green-50' },
  { to: '/queue',            icon: '⏱️', label: 'Manage queue',    desc: 'Today\'s queue list',      bg: 'bg-amber-50' },
  { to: '/revenue',          icon: '💰', label: 'Revenue',         desc: 'Today\'s income',          bg: 'bg-purple-50' },
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