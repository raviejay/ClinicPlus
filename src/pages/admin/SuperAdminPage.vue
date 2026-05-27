<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.24em] text-sky-500">Super Admin</p>
          <h1 class="text-3xl font-black tracking-tight text-slate-900">Clinics & Branches</h1>
          <p class="text-sm text-slate-500 mt-2 max-w-2xl">
            View all clinics, their branches, and subscription plans. Manage your clinic network from one place.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total Clinics</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.totalClinics }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total Branches</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.totalBranches }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">In Trial</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.trialClinics }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-3xl shadow-sm p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Clinic Network</h2>
            <p class="text-sm text-slate-500">Plan, trial status, and branches for each clinic.</p>
          </div>
        </div>

        <div v-if="loading" class="py-16 text-center text-slate-400">
          Loading clinics…
        </div>

        <div v-else>
          <div v-if="errorMessage" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {{ errorMessage }}
          </div>

          <div v-if="clinicsWithBranches.length === 0" class="py-12 text-center text-slate-500">
            No clinics registered yet.
          </div>

          <div v-else class="space-y-4">
            <div v-for="clinic in clinicsWithBranches" :key="clinic.id" class="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
              <!-- Clinic Header -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-bold text-slate-900">{{ clinic.name }}</h3>
                    <span :class="planBadgeClasses(clinic.plan)" class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {{ clinic.plan }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 font-mono mb-1">{{ clinic.id }}</p>
                  <p v-if="clinic.email" class="text-sm text-slate-600">{{ clinic.email }}</p>
                </div>
                <div class="text-right">
                  <span :class="trialStatusClasses(clinic)" class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                    {{ trialStatusLabel(clinic) }}
                  </span>
                </div>
              </div>

              <!-- Clinic Details -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold">Slug</p>
                  <p class="text-sm font-mono text-slate-700 mt-1">{{ clinic.slug }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold">Created</p>
                  <p class="text-sm text-slate-700 mt-1">{{ formatDate(clinic.created_at) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold">Branches</p>
                  <p class="text-sm font-bold text-slate-900 mt-1">{{ clinic.branches?.length ?? 0 }}</p>
                </div>
              </div>

              <!-- Branches List -->
              <div v-if="clinic.branches && clinic.branches.length > 0">
                <p class="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 mb-3">Branches</p>
                <div class="space-y-2">
                  <div v-for="branch in clinic.branches" :key="branch.id" class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-semibold text-slate-900">{{ branch.name }}</p>
                        <p v-if="branch.address" class="text-xs text-slate-600 mt-1">📍 {{ branch.address }}</p>
                        <p v-if="branch.contact_number" class="text-xs text-slate-600">📞 {{ branch.contact_number }}</p>
                        <p class="text-xs text-slate-400 font-mono mt-1">{{ branch.id }}</p>
                      </div>
                      <p class="text-xs text-slate-400">{{ formatDate(branch.created_at) }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500 italic">
                No branches yet — main clinic only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { superadminService, type ClinicWithBranches } from '@/services/superadmin.service'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()
const clinicsWithBranches = ref<ClinicWithBranches[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const stats = computed(() => ({
  totalClinics: clinicsWithBranches.value.length,
  totalBranches: clinicsWithBranches.value.reduce((sum, c) => sum + (c.branches?.length ?? 0), 0),
  trialClinics: clinicsWithBranches.value.filter(c => c.is_trial).length,
}))

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function planBadgeClasses(plan: string) {
  const baseClasses = 'capitalize'
  switch (plan) {
    case 'premium':
      return `${baseClasses} bg-purple-100 text-purple-700`
    case 'pro':
      return `${baseClasses} bg-blue-100 text-blue-700`
    case 'starter':
      return `${baseClasses} bg-slate-100 text-slate-700`
    default:
      return baseClasses
  }
}

function trialStatusLabel(clinic: any) {
  if (clinic.is_trial) {
    return clinic.trial_ends_at ? `Trial until ${formatDate(clinic.trial_ends_at)}` : 'Trial active'
  }
  return 'Subscribed'
}

function trialStatusClasses(clinic: any) {
  return clinic.is_trial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
}

async function loadClinics() {
  loading.value = true
  errorMessage.value = null
  const { data, error } = await superadminService.getAllClinicsWithBranches()
  loading.value = false

  if (error) {
    errorMessage.value = error
    return
  }

  clinicsWithBranches.value = data ?? []
}

onMounted(() => {
  if (!authStore.isSuperAdmin) return
  loadClinics()
})
</script>
