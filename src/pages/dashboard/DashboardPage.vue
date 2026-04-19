<template>
  <AppLayout>
    <div class="space-y-4 pt-2">
      <!-- Greeting -->
      <div>
        <h1 class="text-lg font-bold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-500">{{ authStore.clinic?.name }}</p>
      </div>

      <!-- Trial banner -->
      <div v-if="authStore.clinic?.is_trial"
        class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
        <svg class="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-800">Trial Active</p>
          <p class="text-xs text-amber-600 mt-0.5">Expires {{ trialExpiry }}</p>
        </div>
      </div>

      <!-- Stat cards (placeholder) -->
      <div class="grid grid-cols-2 gap-3">
        <div class="card">
          <p class="text-xs text-gray-500 mb-1">Patients</p>
          <p class="text-2xl font-bold text-gray-900">—</p>
        </div>
        <div class="card">
          <p class="text-xs text-gray-500 mb-1">Appointments</p>
          <p class="text-2xl font-bold text-gray-900">—</p>
        </div>
        <div class="card">
          <p class="text-xs text-gray-500 mb-1">Today's Queue</p>
          <p class="text-2xl font-bold text-gray-900">—</p>
        </div>
        <div class="card">
          <p class="text-xs text-gray-500 mb-1">Revenue</p>
          <p class="text-2xl font-bold text-gray-900">—</p>
        </div>
      </div>

      <!-- Plan badge -->
      <div class="card flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500">Current Plan</p>
          <p class="text-sm font-semibold text-gray-900 capitalize">{{ authStore.clinic?.plan ?? 'Starter' }}</p>
        </div>
        <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
          {{ authStore.profile?.role }}
        </span>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()

const trialExpiry = computed(() => {
  if (!authStore.clinic?.trial_ends_at) return 'N/A'
  return new Date(authStore.clinic.trial_ends_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
})
</script>
