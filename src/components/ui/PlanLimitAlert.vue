<template>
  <div v-if="!limitCheck.allowed" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
    <div class="text-yellow-600 mt-0.5">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4v2m0 0a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/>
      </svg>
    </div>
    <div class="flex-1">
      <h3 class="font-bold text-yellow-900 text-sm mb-1">
        {{ title }} limit reached ({{ limitCheck.current }}/{{ limitCheck.max }})
      </h3>
      <p class="text-xs text-yellow-700 mb-3">
        {{ message }}
      </p>
      <RouterLink to="/admin/billing"
        class="inline-block text-xs font-bold bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors">
        Upgrade plan
      </RouterLink>
    </div>
  </div>

  <div v-else-if="limitCheck.remaining <= warningThreshold" class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex items-start gap-3">
    <div class="text-orange-600 mt-0.5">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
    </div>
    <div class="flex-1">
      <h3 class="font-bold text-orange-900 text-sm mb-1">
        Approaching {{ title.toLowerCase() }} limit
      </h3>
      <p class="text-xs text-orange-700">
        You have {{ limitCheck.remaining }} {{ title.toLowerCase() }} remaining ({{ limitCheck.current }}/{{ limitCheck.max }})
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LimitCheck } from '@/services/planRestriction.service'

const props = defineProps<{
  limitCheck: LimitCheck
  title: string // 'Patients', 'Staff', 'Branches'
  warningThreshold?: number
}>()

const message = computed(() => {
  if (props.title === 'Patients') {
    return `Your ${props.limitCheck.planName} plan includes up to ${props.limitCheck.max} patients. Upgrade to add more.`
  } else if (props.title === 'Staff') {
    return `Your ${props.limitCheck.planName} plan allows up to ${props.limitCheck.max} staff members. Upgrade to add more.`
  } else if (props.title === 'Branches') {
    return `Your ${props.limitCheck.planName} plan allows up to ${props.limitCheck.max} ${props.limitCheck.max === 1 ? 'branch' : 'branches'}. Upgrade for multi-branch support.`
  }
  return 'You\'ve reached your plan limit. Upgrade to continue.'
})
</script>
