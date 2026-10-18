<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[22rem] max-w-[calc(100vw-2rem)] pointer-events-none" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="t in store.toasts" :key="t.id" role="status"
          class="pointer-events-auto bg-white border border-sky-100 shadow-xl shadow-sky-900/10 rounded-2xl p-4 flex gap-3 items-start">
          <span class="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
            <span class="material-icons text-[20px]">event_available</span>
          </span>
          <button type="button" class="min-w-0 flex-1 text-left" @click="go(t.id)">
            <span class="block text-sm font-black text-slate-900">{{ t.title }}</span>
            <span class="block text-xs text-slate-600 mt-0.5">{{ t.body }}</span>
            <span class="block text-[11px] font-semibold text-sky-600 mt-1.5">View appointments →</span>
          </button>
          <button type="button" aria-label="Dismiss" @click="store.dismissToast(t.id)" class="text-slate-300 hover:text-slate-500">
            <span class="material-icons text-[18px]">close</span>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const store = useNotificationStore()
const router = useRouter()

function go(id: string) {
  store.dismissToast(id)
  void store.markAllSeen()
  router.push('/appointments')
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateY(-10px) scale(0.98); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
