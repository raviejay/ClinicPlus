<template>
  <AppLayout>
    <div class="space-y-4">

      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">My Queue</h1>
        <p class="text-xs text-slate-400 mt-0.5">{{ today }} • Doctor view</p>
      </div>

      <!-- Current patient -->
      <div v-if="nowServing" class="bg-sky-500 rounded-2xl p-5 text-white">
        <p class="text-xs font-semibold opacity-75 uppercase tracking-widest mb-2">Now Consulting</p>
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-3xl">
            {{ nowServing.priority_number }}
          </div>
          <div>
            <p class="font-black text-xl leading-tight">{{ nowServing.patients?.full_name }}</p>
            <p class="text-sm opacity-75">{{ nowServing.patients?.contact_number }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <RouterLink
            :to="`/medical-records/new?patient=${nowServing.patient_id}&queue=${nowServing.id}`"
            class="flex-1 bg-white text-sky-600 font-bold text-sm py-2.5 rounded-xl text-center hover:bg-sky-50 transition-colors">
            📋 Add Record
          </RouterLink>
          <button @click="markDone(nowServing)"
            class="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
            ✓ Done
          </button>
        </div>
      </div>

      <!-- Call next -->
      <button v-else-if="waiting.length > 0" @click="callNext" :disabled="calling"
        class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base shadow-md shadow-green-200 transition-all">
        {{ calling ? 'Calling…' : `Call Next — #${waiting[0]?.priority_number}` }}
      </button>

      <div v-else class="bg-white border border-gray-200 rounded-2xl p-10 text-center">
        <div class="text-3xl mb-3">☕</div>
        <p class="text-sm font-semibold text-slate-700">No patients waiting</p>
        <p class="text-xs text-slate-400 mt-1">Queue is clear for now</p>
      </div>

      <!-- Waiting list -->
      <div v-if="waiting.length > 0">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Up next ({{ waiting.length }})
        </p>
        <div class="space-y-2">
          <div v-for="(item, idx) in waiting" :key="item.id"
            class="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div class="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center font-black text-amber-600 text-sm shrink-0">
              {{ item.priority_number }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">{{ item.patients?.full_name }}</p>
              <p class="text-xs text-slate-400">{{ item.patients?.contact_number }}</p>
            </div>
            <span class="text-xs text-slate-300 shrink-0">#{{ idx + 1 }} in line</span>
          </div>
        </div>
      </div>

      <!-- Completed today -->
      <div v-if="done.length > 0">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Completed today ({{ done.length }})
        </p>
        <div class="space-y-2">
          <div v-for="item in done" :key="item.id"
            class="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
            <div class="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center font-black text-green-500 text-sm shrink-0">
              {{ item.priority_number }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">{{ item.patients?.full_name }}</p>
            </div>
            <span class="text-xs text-green-500 font-semibold">✓ Done</span>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { queueService, type QueueWithPatient } from '@/services/queue.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

const authStore = useAuthStore()
const queue = ref<QueueWithPatient[]>([])
const calling = ref(false)
let channel: RealtimeChannel | null = null

const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

const nowServing = computed(() => queue.value.find(q => q.status === 'now_serving') ?? null)
const waiting = computed(() => queue.value.filter(q => q.status === 'waiting'))
const done = computed(() => queue.value.filter(q => q.status === 'done'))

async function loadQueue() {
  if (!authStore.clinic?.id || !authStore.profile?.id) return
  const { data } = await queueService.getTodayQueue(authStore.clinic.id, authStore.profile.id)
  queue.value = data ?? []
}

async function callNext() {
  if (!authStore.clinic?.id) return
  calling.value = true
  await queueService.callNext(authStore.clinic.id, authStore.profile?.id ?? undefined)
  await loadQueue()
  calling.value = false
}

async function markDone(item: QueueWithPatient) {
  if (!authStore.clinic?.id) return
  await queueService.updateStatus(authStore.clinic.id, item.id, 'done')
  await loadQueue()
}

onMounted(async () => {
  await loadQueue()
  if (authStore.clinic?.id) {
    channel = queueService.subscribeToQueue(authStore.clinic.id, loadQueue)
  }
})

onUnmounted(() => channel?.unsubscribe())
</script>