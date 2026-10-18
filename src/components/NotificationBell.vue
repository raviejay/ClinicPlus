<template>
  <div class="relative" data-menu>
    <button type="button" @click="toggle" :aria-expanded="open" aria-haspopup="true"
      :aria-label="store.unreadCount ? `Notifications, ${store.unreadCount} new` : 'Notifications'"
      class="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
      <span class="material-icons" style="font-size:20px">{{ store.unreadCount ? 'notifications_active' : 'notifications' }}</span>
      <span v-if="store.unreadCount" data-testid="badge"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
        {{ badgeLabel(store.unreadCount) }}
      </span>
    </button>

    <div v-if="open" class="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
      role="dialog" aria-label="Notifications">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 class="text-sm font-black text-slate-900">Notifications</h2>
        <button v-if="store.unreadCount" type="button" @click="store.markAllSeen()"
          class="text-xs font-semibold text-sky-600 hover:text-sky-700">Mark all as read</button>
      </div>

      <ul v-if="store.items.length" class="max-h-96 overflow-y-auto divide-y divide-gray-50">
        <li v-for="n in store.items" :key="n.id">
          <button type="button" @click="openItem"
            :class="['w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors', isUnread(n) && 'bg-sky-50/60']">
            <span class="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
              <span class="material-icons text-[18px]">event_available</span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-900 truncate">{{ n.title }}</span>
                <span v-if="isUnread(n)" class="w-2 h-2 rounded-full bg-sky-500 shrink-0" aria-label="Unread"></span>
              </span>
              <span class="block text-xs text-slate-600 mt-0.5">{{ n.body }}</span>
              <span class="block text-[11px] text-slate-400 mt-1">{{ timeAgo(n.created_at) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <div v-else class="px-4 py-10 text-center">
        <span class="material-icons text-4xl text-slate-200">notifications_none</span>
        <p class="text-sm font-semibold text-slate-600 mt-2">Nothing new yet</p>
        <p class="text-xs text-slate-400 mt-1">You will be told here when a patient books online.</p>
      </div>

      <div class="px-4 py-3 border-t border-gray-100 bg-slate-50 space-y-2">
        <label class="flex items-center justify-between text-xs text-slate-600 cursor-pointer">
          <span class="flex items-center gap-1.5"><span class="material-icons text-[16px] text-slate-400">volume_up</span>Play a sound</span>
          <input type="checkbox" :checked="store.soundOn" @change="store.setSound(($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400" />
        </label>
        <button v-if="store.desktopPermission === 'default'" type="button" @click="store.enableDesktop()"
          class="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg py-2 transition-colors">
          <span class="material-icons text-[16px]">desktop_windows</span>Also alert me when this tab is in the background
        </button>
        <p v-else-if="store.desktopPermission === 'denied'" class="text-[11px] text-slate-400">
          Desktop alerts are blocked in your browser settings.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'
import { badgeLabel, timeAgo } from '@/utils/notifications'
import type { AppNotification } from '@/types'

const store = useNotificationStore()
const router = useRouter()
const open = ref(false)
// Remember what was unread when the panel was opened, so items do not change look under the reader's eyes
const unreadAtOpen = ref<Set<string>>(new Set())

const isUnread = (n: AppNotification) => unreadAtOpen.value.has(n.id) || store.unread.some(u => u.id === n.id)

function toggle() {
  open.value = !open.value
  if (open.value) {
    unreadAtOpen.value = new Set(store.unread.map(n => n.id))
    void store.markAllSeen()
  }
}

function openItem() {
  open.value = false
  router.push('/appointments')
}

function close(e: MouseEvent) {
  if (open.value && !(e.target as HTMLElement).closest('[data-menu]')) open.value = false
}
onMounted(() => document.addEventListener('click', close, true))
onBeforeUnmount(() => document.removeEventListener('click', close, true))
</script>
