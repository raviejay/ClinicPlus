<template>
  <div>
    <div class="flex items-center justify-between mb-1.5">
      <label :for="id" class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{{ label }}</label>
      <slot name="aside" />
    </div>
    <div class="relative">
      <input :id="id" :value="modelValue" :type="visible ? 'text' : 'password'" :autocomplete="autocomplete"
        :placeholder="placeholder" :required="required" :aria-describedby="hasHint ? `${id}-hint` : undefined"
        autocapitalize="none" spellcheck="false"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown="onKey" @keyup="onKey" @blur="capsOn = false"
        class="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white" />
      <button type="button" @click="visible = !visible" :aria-pressed="visible"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
        <span class="material-icons text-[18px]">{{ visible ? 'visibility_off' : 'visibility' }}</span>
      </button>
    </div>
    <p v-if="capsOn" id="caps-hint" role="status" class="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
      <span class="material-icons text-[14px]">keyboard_capslock</span>Caps Lock is on
    </p>
    <div v-if="hasHint" :id="`${id}-hint`"><slot name="hint" /></div>
  </div>
</template>

<script setup lang="ts">
import { ref, useSlots } from 'vue'

withDefaults(defineProps<{
  modelValue: string
  id: string
  label?: string
  autocomplete?: 'current-password' | 'new-password'
  placeholder?: string
  required?: boolean
}>(), { label: 'Password', autocomplete: 'current-password', placeholder: '••••••••', required: true })
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const hasHint = !!useSlots().hint
const visible = ref(false)
const capsOn = ref(false)

function onKey(e: KeyboardEvent) {
  if (typeof e.getModifierState === 'function') capsOn.value = e.getModifierState('CapsLock')
}
</script>
