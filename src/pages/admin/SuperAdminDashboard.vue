<template>
  <AppLayout>
    <div class="space-y-6">

      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1">Super Admin</p>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">Clinic Network</h1>
        <p class="text-sm text-slate-400 mt-1">Manage plans, monitor trials, and oversee all registered clinics.</p>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total clinics</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active trials</p>
          <p class="text-2xl font-black text-amber-500 mt-1">{{ stats.activeTrial }}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Expired trials</p>
          <p class="text-2xl font-black text-red-500 mt-1">{{ stats.expiredTrial }}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Subscribed</p>
          <p class="text-2xl font-black text-green-600 mt-1">{{ stats.subscribed }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 class="text-sm font-bold text-slate-900">All clinics</h2>
          <input v-model="search" type="text" placeholder="Search clinic or email…"
            class="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 w-52" />
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="filtered.length === 0" class="py-16 text-center text-sm text-slate-400">
          No clinics found
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-slate-50">
                <th class="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-5 py-3">Clinic</th>
                <th class="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Email</th>
                <th class="text-center text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Branches</th>
                <th class="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th class="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Plan</th>
                <th class="text-left text-xs font-bold text-slate-400 uppercase tracking-wide px-4 py-3">Joined</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
          <tbody class="divide-y divide-gray-100">
  <template v-for="clinic in filtered" :key="clinic.id">
    
    <!-- Clinic row -->
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center font-black text-xs text-sky-600 shrink-0">
            {{ clinic.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-semibold text-slate-900 text-sm">{{ clinic.name }}</p>
            <p class="text-xs text-slate-400 font-mono">{{ clinic.slug }}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-3.5">
        <p class="text-sm text-slate-600">{{ clinic.email ?? '—' }}</p>
      </td>
      <td class="px-4 py-3.5 text-center">
        <span class="text-sm font-semibold text-slate-700">
          {{ (clinic.branches?.length ?? 0) + 1 }}
        </span>
        <p class="text-xs text-slate-400">incl. main</p>
      </td>
      <td class="px-4 py-3.5">
        <template v-if="!clinic.is_trial">
          <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Subscribed
          </span>
        </template>
        <template v-else-if="isTrialActive(clinic)">
          <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Trial
          </span>
          <p class="text-xs text-slate-400 mt-0.5">{{ trialDaysLeft(clinic) }} days left</p>
        </template>
        <template v-else>
          <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Trial expired
          </span>
        </template>
      </td>
      <td class="px-4 py-3.5">
        <select
          :value="clinic.plan"
          @change="handlePlanChange(clinic, ($event.target as HTMLSelectElement).value)"
          :disabled="updatingId === clinic.id"
          class="text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors cursor-pointer disabled:opacity-50"
          :class="planSelectClass(clinic.plan)">
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <div v-if="updatingId === clinic.id" class="mt-1 flex items-center gap-1 text-xs text-sky-500">
          <div class="w-3 h-3 border border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          Saving…
        </div>
      </td>
      <td class="px-4 py-3.5">
        <p class="text-xs text-slate-500">{{ formatDate(clinic.created_at) }}</p>
      </td>
      <td class="px-4 py-3.5">
        <button
          @click="toggleExpand(clinic.id)"
          class="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
          :title="expanded === clinic.id ? 'Hide branches' : 'Show branches'">
          <span class="material-icons text-sm transition-transform duration-200"
            :style="expanded === clinic.id ? 'transform: rotate(180deg)' : ''">
            expand_more
          </span>
        </button>
      </td>
    </tr>

    <!-- Expanded branches row — immediately after its clinic row -->
    <tr v-if="expanded === clinic.id" class="bg-slate-50">
      <td colspan="7" class="px-5 py-4 border-b border-slate-100">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Branches</p>
        <div class="space-y-2">

          <!-- Main branch -->
          <div class="flex items-center gap-3 bg-white border border-amber-100 rounded-xl px-3 py-2.5">
            <span class="material-icons text-amber-400 text-sm">store</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-800">{{ clinic.name }}</p>
              <p class="text-xs text-slate-400">Main branch</p>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Main</span>
          </div>

          <!-- Additional branches -->
          <div v-if="clinic.branches && clinic.branches.length > 0">
            <div v-for="branch in clinic.branches" :key="branch.id"
              class="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <span class="material-icons text-slate-400 text-sm">store</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-800">{{ branch.name }}</p>
                <p v-if="branch.address" class="text-xs text-slate-400 truncate">{{ branch.address }}</p>
                <p v-if="branch.contact_number" class="text-xs text-slate-400">{{ branch.contact_number }}</p>
              </div>
              <p class="text-xs text-slate-400 shrink-0">{{ formatDate(branch.created_at) }}</p>
            </div>
          </div>

          <div v-else class="text-xs text-slate-400 px-3 py-2 italic">
            No additional branches
          </div>
        </div>
      </td>
    </tr>

  </template>
</tbody>
          </table>
        </div>
      </div>

      <!-- Toast -->
      <Transition name="fade">
        <div v-if="toast"
          class="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {{ toast }}
        </div>
      </Transition>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { superadminService, type ClinicWithBranches } from '@/services/superadmin.service'
import { supabase } from '@/services/supabase'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()
const clinics = ref<ClinicWithBranches[]>([])
const loading = ref(false)
const search = ref('')
const expanded = ref<string | null>(null)
const updatingId = ref<string | null>(null)
const toast = ref<string | null>(null)

const stats = computed(() => ({
  total: clinics.value.length,
  activeTrial: clinics.value.filter(c => c.is_trial && isTrialActive(c)).length,
  expiredTrial: clinics.value.filter(c => c.is_trial && !isTrialActive(c)).length,
  subscribed: clinics.value.filter(c => !c.is_trial).length,
}))

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return clinics.value
  return clinics.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.email ?? '').toLowerCase().includes(q) ||
    c.slug.toLowerCase().includes(q)
  )
})

function isTrialActive(clinic: ClinicWithBranches) {
  if (!clinic.is_trial) return false
  if (!clinic.trial_ends_at) return true
  return new Date(clinic.trial_ends_at) > new Date()
}

function trialDaysLeft(clinic: ClinicWithBranches) {
  if (!clinic.trial_ends_at) return '∞'
  const diff = new Date(clinic.trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function planSelectClass(plan: string) {
  switch (plan) {
    case 'premium': return 'bg-purple-50 border-purple-200 text-purple-700'
    case 'pro':     return 'bg-blue-50 border-blue-200 text-blue-700'
    default:        return 'bg-slate-100 border-gray-200 text-slate-600'
  }
}

function toggleExpand(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = null }, 3000)
}

async function handlePlanChange(clinic: ClinicWithBranches, newPlan: string) {
  if (newPlan === clinic.plan) return
  updatingId.value = clinic.id

  const { error } = await supabase
    .from('clinics')
    .update({ plan: newPlan, is_trial: false })
    .eq('id', clinic.id)

  updatingId.value = null

  if (error) {
    showToast('Failed to update plan')
    return
  }

  // Update local state
  const target = clinics.value.find(c => c.id === clinic.id)
  if (target) {
    target.plan = newPlan
    target.is_trial = false
  }

  showToast(`${clinic.name} updated to ${newPlan}`)
}

async function loadClinics() {
  loading.value = true
  const { data, error } = await superadminService.getAllClinicsWithBranches()
  loading.value = false
  if (!error) clinics.value = data ?? []
}

onMounted(() => {
  if (!authStore.isSuperAdmin) return
  loadClinics()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>