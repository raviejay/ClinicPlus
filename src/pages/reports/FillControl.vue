<template>
  <div class="mt-2">
    <span class="block text-[11px] font-semibold text-slate-500 mb-1">Background</span>
    <div class="flex items-center gap-2">
      <input type="color" :value="fill ?? '#ffffff'" :disabled="!fill" aria-label="Background color"
        @input="emit('change', ($event.target as HTMLInputElement).value)"
        class="h-8 w-14 rounded-lg border border-gray-200 p-0.5 bg-white disabled:opacity-40" />
      <label class="flex items-center gap-1.5 text-xs text-slate-600">
        <input type="checkbox" :checked="!!fill" class="accent-sky-500"
          @change="emit('change', ($event.target as HTMLInputElement).checked ? '#f8fafc' : undefined)" />
        Fill
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ fill?: string }>()
const emit = defineEmits<{ (e: 'change', value: string | undefined): void }>()
</script>
