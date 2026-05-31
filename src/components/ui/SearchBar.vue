<template>
  <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-1">
    <div class="relative flex items-center">
      <span class="material-icons absolute left-3 text-slate-400 text-xl pointer-events-none">search</span>
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        class="w-full bg-transparent rounded-xl pl-10 pr-20 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        @input="onInput"
      />
      <div class="absolute right-2 flex items-center gap-1">
        <div v-if="loading" class="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <button
          v-else-if="modelValue"
          type="button"
          class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Clear search"
          @click="$emit('update:modelValue', '')"
        >
          <span class="material-icons text-lg">close</span>
        </button>
      </div>
    </div>
    <p v-if="resultText" class="px-3 pb-2 pt-0.5 text-xs text-slate-500">{{ resultText }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  loading?: boolean
  resultText?: string
}>(), {
  placeholder: 'Search…',
  loading: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>
