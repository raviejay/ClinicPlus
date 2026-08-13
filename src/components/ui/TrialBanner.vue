<template>
  <!-- Trial expiring soon -->
  <div v-if="isTrialActive && trialDaysLeft <= 5"
    class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-sm text-amber-800 font-medium">
        Trial ends in <strong>{{ trialDaysLeft }} day{{ trialDaysLeft === 1 ? '' : 's' }}</strong> — upgrade to keep your data.
      </p>
    </div>
    <RouterLink to="/admin/billing"
      class="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
      Upgrade now
    </RouterLink>
  </div>

  <!-- Trial active, plenty of time -->
  <div v-else-if="isTrialActive"
    class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></span>
      <p class="text-sm text-green-800">
        <strong>Premium trial active</strong> — {{ trialDaysLeft }} days remaining.
      </p>
    </div>
    <span class="text-xs font-semibold text-green-600">Full access</span>
  </div>

  <!-- Trial expired -->
  <div v-else-if="trialExpired"
    class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-sm text-red-800 font-medium">Your trial has expired — you're in read-only mode. Choose a plan to add new patients, records, or appointments.</p>
    </div>
    <RouterLink to="/admin/billing"
      class="text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
      Choose a plan
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useClinic } from '@/composables/useClinic'
const { isTrialActive, trialDaysLeft, trialExpired } = useClinic()
</script>