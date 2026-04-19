<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Mobile top navbar -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="flex items-center justify-between px-4 h-14">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
            </svg>
          </div>
          <span class="font-semibold text-gray-900 text-sm truncate max-w-[140px]">
            {{ authStore.clinic?.name ?? 'Clinic SaaS' }}
          </span>
        </div>
        <button @click="authStore.logout()"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1 p-4 max-w-2xl mx-auto w-full">
      <slot />
    </main>

    <!-- Mobile bottom nav -->
    <nav class="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10">
      <div class="flex items-center justify-around h-14 max-w-lg mx-auto">
        <RouterLink to="/dashboard" class="flex flex-col items-center gap-0.5 text-xs"
          :class="$route.name === 'dashboard' ? 'text-blue-600' : 'text-gray-400'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </RouterLink>
        <!-- More nav items added in later phases -->
      </div>
    </nav>

    <!-- Spacer for fixed bottom nav -->
    <div class="h-14" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>
