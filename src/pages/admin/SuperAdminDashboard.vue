<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.24em] text-sky-500">Super Admin</p>
          <h1 class="text-3xl font-black tracking-tight text-slate-900">Clinic Network Overview</h1>
          <p class="text-sm text-slate-500 mt-2 max-w-2xl">
            View all clinics and their branches. Manage your clinic network from one place.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total Clinics</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.totalClinics }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">In Trial</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.trialClinics }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Premium</p>
            <p class="text-2xl font-black text-slate-900 mt-2">{{ stats.premiumClinics }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-3xl shadow-sm p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Clinics & Branches</h2>
            <p class="text-sm text-slate-500">View clinic details and their associated branches.</p>
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
            No registered clinics are available yet.
          </div>

          <div v-else class="space-y-3">
            <div v-for="clinic in clinicsWithBranches" :key="clinic.id" class="border border-slate-200 rounded-2xl overflow-hidden">
              <!-- Clinic Row -->
              <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-200 hover:bg-slate-100 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-base font-bold text-slate-900">{{ clinic.name }}</h3>
                      <span :class="planBadge(clinic.plan)" class="text-xs font-semibold px-2 py-1 rounded-full">
                        {{ clinic.plan }}
                      </span>
                      <span :class="trialStatus(clinic)" class="text-xs font-semibold px-2 py-1 rounded-full">
                        {{ trialLabel(clinic) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 font-mono">{{ clinic.id }}</p>
                    <p v-if="clinic.email" class="text-sm text-slate-600 mt-1">{{ clinic.email }}</p>
                  </div>
                  <div class="text-right text-xs text-slate-500">
                    <p>{{ clinic.branches?.length ?? 0 }} branch(es)</p>
                    <p>Created {{ formatDate(clinic.created_at) }}</p>
                  </div>
                </div>
              </div>

              <!-- Branches (if any) -->
              <div v-if="clinic.branches && clinic.branches.length > 0" class="divide-y divide-slate-100">
                <div v-for="branch in clinic.branches" :key="branch.id" class="px-5 py-3 bg-white hover:bg-slate-50 transition-colors ml-8">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <p class="font-semibold text-slate-900">📍 {{ branch.name }}</p>
                      <p v-if="branch.address" class="text-sm text-slate-600 mt-1">{{ branch.address }}</p>
                      <p v-if="branch.contact_number" class="text-sm text-slate-600">📞 {{ branch.contact_number }}</p>
                      <p class="text-xs text-slate-400 font-mono mt-1">{{ branch.id }}</p>
                    </div>
                    <p class="text-xs text-slate-400">{{ formatDate(branch.created_at) }}</p>
                  </div>
                </div>
              </div>

              <!-- No branches message -->
              <div v-else class="px-5 py-3 bg-white text-slate-500 text-sm italic ml-8">
                Main clinic only — no branches
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
  trialClinics: clinicsWithBranches.value.filter(c => c.is_trial).length,
  premiumClinics: clinicsWithBranches.value.filter(c => c.plan === 'premium').length,
}))

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function planBadge(plan: string) {
  const baseClasses = 'text-xs font-semibold px-2.5 py-1 rounded-full'
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

function trialStatus(clinic: any) {
  return clinic.is_trial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
}

function trialLabel(clinic: any) {
  if (clinic.is_trial) {
    return clinic.trial_ends_at ? `Trial until ${formatDate(clinic.trial_ends_at)}` : 'Trial'
  }
  return 'Subscribed'
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
