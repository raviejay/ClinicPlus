<template>
  <slot v-if="allowed" />
  <div v-else class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
    <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
      <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
    </div>
    <p class="text-sm font-semibold text-slate-700 mb-1">{{ label }} requires {{ requiredPlan }}</p>
    <p class="text-xs text-slate-400 mb-3">Upgrade your plan to unlock this feature.</p>
    <RouterLink to="/admin/billing"
      class="inline-block text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg transition-colors">
      Upgrade plan
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClinic } from '@/composables/useClinic'

const props = defineProps<{
  feature: string
  label?: string
  requiredPlan?: string
}>()

const { canUseFeature } = useClinic()
const allowed = computed(() => canUseFeature(props.feature))
</script>