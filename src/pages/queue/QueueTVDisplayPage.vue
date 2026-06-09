<template>
  <!-- Fullscreen TV Display -->
  <div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 flex flex-col group">
    
    <!-- Top Bar - Live Indicator + Exit Button (show on hover) -->
    <div class="absolute top-6 right-6 flex items-center gap-3">
      <div class="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-full">
        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span class="text-sm font-bold">LIVE</span>
      </div>
      <RouterLink :to="{ name: 'queue' }"
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        Exit
      </RouterLink>
    </div>

    <!-- Main Content -->
    <div class="flex-1 grid grid-cols-3 gap-8">
      
      <!-- Currently Serving (Large - takes up more space) -->
      <div class="col-span-2 flex flex-col">
        <div class="text-4xl font-black uppercase tracking-widest text-slate-400 mb-6">Now Serving</div>
        
        <div v-if="nowServing" class="flex-1 bg-blue-600 rounded-3xl p-12 flex flex-col items-center justify-center shadow-2xl">
          <div class="text-9xl font-black mb-8 text-white drop-shadow-lg">
            {{ nowServing.priority_number }}
          </div>
          <div class="text-center">
            <p class="text-5xl font-black mb-4 text-white">{{ nowServing.patients?.full_name }}</p>
            <p class="text-2xl text-blue-100">{{ nowServing.patients?.contact_number }}</p>
          </div>
        </div>

        <div v-else class="flex-1 bg-slate-700 rounded-3xl p-12 flex items-center justify-center">
          <div class="text-center">
            <p class="text-5xl font-black text-slate-400">😴</p>
            <p class="text-3xl font-bold text-slate-300 mt-4">No Patient Being Served</p>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="col-span-1 flex flex-col gap-6 overflow-hidden">
        
        <!-- Waiting List -->
        <div class="flex-1 flex flex-col bg-slate-700 rounded-2xl p-6 overflow-hidden">
          <div class="text-2xl font-black uppercase tracking-widest text-slate-300 mb-4">Waiting</div>
          <div class="flex-1 overflow-y-auto space-y-2">
            <div v-if="waiting.length === 0" class="text-slate-400 text-lg text-center py-4">
              No one waiting
            </div>
            <div v-for="(item, idx) in waiting.slice(0, 8)" :key="item.id" 
              class="bg-slate-600 rounded-xl p-4 flex items-center gap-3">
              <div class="w-14 h-14 bg-amber-500 rounded-lg flex items-center justify-center font-black text-2xl text-white shrink-0">
                {{ item.priority_number }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-bold text-lg truncate">{{ item.patients?.full_name }}</p>
                <p class="text-sm text-slate-300">{{ idx + 1 }} in line</p>
              </div>
            </div>
            <div v-if="waiting.length > 8" class="text-slate-400 text-sm text-center py-2">
              +{{ waiting.length - 8 }} more
            </div>
          </div>
        </div>

        <!-- Done List -->
        <div class="flex-1 flex flex-col bg-slate-700 rounded-2xl p-6 overflow-hidden">
          <div class="text-2xl font-black uppercase tracking-widest text-slate-300 mb-4">Completed</div>
          <div class="flex-1 overflow-y-auto space-y-2">
            <div v-if="done.length === 0" class="text-slate-400 text-lg text-center py-4">
              No completed visits
            </div>
            <div v-for="item in done.slice(0, 5)" :key="item.id" 
              class="bg-slate-600 rounded-xl p-3 flex items-center gap-2 opacity-75">
              <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0">
                {{ item.priority_number }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-sm truncate">{{ item.patients?.full_name }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { queueService, type QueueWithPatient } from '@/services/queue.service'
import type { RealtimeChannel } from '@supabase/supabase-js'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const queue = ref<QueueWithPatient[]>([])
let realtimeChannel: RealtimeChannel | null = null
let refreshInterval: NodeJS.Timeout | null = null

const nowServing = computed(() =>
  queue.value.find(q => q.status === 'now_serving') ?? null
)

const waiting = computed(() =>
  queue.value.filter(q => q.status === 'waiting')
)

const done = computed(() =>
  queue.value.filter(q => q.status === 'done')
)

async function loadQueue() {
  if (!authStore.clinic?.id) return
  const { data } = await queueService.getTodayQueue(authStore.clinic.id)
  queue.value = data ?? []
}

onMounted(async () => {
  await loadQueue()

  // Subscribe to realtime updates
  if (authStore.clinic?.id) {
    realtimeChannel = queueService.subscribeToQueue(authStore.clinic.id, async () => {
      await loadQueue()
    })
  }

  // Also refresh every 2 seconds to ensure updates
  refreshInterval = setInterval(loadQueue, 2000)

  watchBranchChange(async () => {
    await loadQueue()
  })

  // Hide browser UI for fullscreen experience
  document.documentElement.style.overflow = 'hidden'
})

onUnmounted(() => {
  realtimeChannel?.unsubscribe()
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  document.documentElement.style.overflow = 'auto'
})
</script>

<style scoped>
/* Smooth scrolling for the waiting and done lists */
div::-webkit-scrollbar {
  width: 8px;
}

div::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

div::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

div::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
