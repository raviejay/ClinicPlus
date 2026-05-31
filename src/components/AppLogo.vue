<template>
  <div class="flex items-center gap-3">
    <div class="relative">
      <img
        src="/logo.png"
        alt="ClinicGo"
        :class="sizeClass"
        class="object-contain rounded-xl"
        @error="imgError = true"
        v-if="!imgError"
      />

      <!-- Fallback if image fails to load -->
      <div
        v-else
        :class="[
          'bg-sky-500 rounded-xl flex items-center justify-center font-black text-white',
          sizeClass
        ]"
      >
        <span :class="textClass">C</span>
      </div>

      <!-- Status dot -->
      <div
        v-if="showDot"
        class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
      ></div>
    </div>

    <span
      v-if="showName"
      :class="['font-black tracking-tight text-slate-900', nameClass]"
    >
      ClinicGo
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    showName?: boolean
    showDot?: boolean
  }>(),
  {
    size: 'md',
    showName: true,
    showDot: false
  }
)

const imgError = ref(false)

// Increased sizes for better visibility
const sizeClass = computed(() => ({
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}[props.size]))

const textClass = computed(() => ({
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl'
}[props.size]))

const nameClass = computed(() => ({
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl'
}[props.size]))
</script>