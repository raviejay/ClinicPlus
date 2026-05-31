<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="flex justify-center">
          <AppLogo size="lg" />
        </div>
        <p class="text-gray-500 text-sm mt-3">Clinic management for Philippine clinics</p>
      </div>
      <div class="card shadow-md">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue'
</script>
