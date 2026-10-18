<template>
  <div v-if="check.score > 0" class="mt-2" aria-live="polite">
    <div class="flex gap-1" aria-hidden="true">
      <span v-for="n in 4" :key="n" class="h-1 flex-1 rounded-full transition-colors"
        :class="n <= check.score ? BAR[check.score] : 'bg-slate-200'"></span>
    </div>
    <p :class="['text-xs mt-1', check.ok ? 'text-slate-500' : 'text-red-500']">{{ check.label }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { checkPassword } from '@/utils/auth'

const props = defineProps<{ password: string }>()
const check = computed(() => checkPassword(props.password))
const BAR: Record<number, string> = { 1: 'bg-red-400', 2: 'bg-amber-400', 3: 'bg-lime-500', 4: 'bg-green-500' }
</script>
