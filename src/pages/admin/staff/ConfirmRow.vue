<template>
  <div :class="['border rounded-xl px-4 py-3 transition-colors', asking ? 'border-sky-200 bg-sky-50/50' : 'border-gray-200']">
    <div class="flex items-center gap-3">
      <span :class="['material-icons text-[20px] shrink-0', toneIcon]">{{ icon }}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-800">{{ label }}</p>
        <p class="text-xs text-slate-400">{{ hint }}</p>
      </div>
      <button v-if="!asking" type="button" @click="asking = true" :disabled="disabled"
        :class="['shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50', toneButton]">
        {{ label.split(' ')[0] }}
      </button>
    </div>
    <div v-if="asking" class="flex items-center justify-end gap-2 mt-3">
      <span class="text-xs text-slate-500 mr-auto">Are you sure?</span>
      <button type="button" @click="asking = false" :disabled="busy"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white">Cancel</button>
      <button type="button" @click="$emit('confirm')" :disabled="busy || disabled"
        :class="['text-xs font-bold px-3.5 py-1.5 rounded-lg text-white disabled:opacity-60', toneSolid]">
        {{ busy ? 'Working…' : confirmText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  hint: string
  confirmText: string
  tone?: 'normal' | 'warn' | 'danger'
  busy?: boolean
  disabled?: boolean
}>(), { tone: 'normal' })
defineEmits<{ (e: 'confirm'): void }>()

const asking = ref(false)

const toneIcon = computed(() => ({ normal: 'text-sky-500', warn: 'text-amber-500', danger: 'text-red-500' })[props.tone])
const toneButton = computed(() => ({
  normal: 'border-sky-200 text-sky-600 hover:bg-sky-50',
  warn: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  danger: 'border-red-200 text-red-600 hover:bg-red-50',
})[props.tone])
const toneSolid = computed(() => ({ normal: 'bg-sky-500 hover:bg-sky-600', warn: 'bg-amber-500 hover:bg-amber-600', danger: 'bg-red-500 hover:bg-red-600' })[props.tone])
</script>
