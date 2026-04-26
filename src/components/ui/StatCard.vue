<template>
  <div class="bg-white border border-gray-200 rounded-xl p-4">
    <div class="flex items-start justify-between mb-3">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg" :class="iconBg">
        {{ icon }}
      </div>
      <span v-if="trend !== undefined"
        :class="['text-xs font-semibold px-2 py-0.5 rounded-full', trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600']">
        {{ trend >= 0 ? '+' : '' }}{{ trend }}%
      </span>
    </div>
    <p class="text-2xl font-black text-slate-900 tracking-tight">{{ value }}</p>
    <p class="text-xs text-slate-400 mt-0.5">{{ label }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon: string
  label: string
  value: string | number
  iconBg?: string
  trend?: number
}>(), {
  iconBg: 'bg-sky-50'
})
</script>