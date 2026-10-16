<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
      <span class="material-icons text-green-500 text-sm">check_circle</span>
      <p class="text-xs text-green-700 font-medium">{{ title }}</p>
    </div>

    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs text-slate-400">Email</span>
        <span class="text-xs font-mono font-semibold text-slate-700 truncate">{{ email }}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs text-slate-400">Password</span>
        <span class="text-xs font-mono font-semibold text-slate-700 select-all" data-testid="password">{{ password }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button type="button" @click="copy(password, 'password')"
        class="flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors">
        <span class="material-icons text-[15px]">{{ copied === 'password' ? 'check' : 'content_copy' }}</span>
        {{ copied === 'password' ? 'Copied' : 'Copy password' }}
      </button>
      <button type="button" @click="copy(message, 'message')"
        class="flex items-center justify-center gap-1.5 border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold py-2.5 rounded-xl transition-colors">
        <span class="material-icons text-[15px]">{{ copied === 'message' ? 'check' : 'chat' }}</span>
        {{ copied === 'message' ? 'Copied' : 'Copy login details' }}
      </button>
    </div>

    <p class="text-xs text-slate-400 text-center">
      This password is shown once. They can change it after signing in.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { loginDetailsMessage } from '@/utils/staff'

const props = defineProps<{ title: string; email: string; password: string; clinicName: string }>()

const copied = ref<'password' | 'message' | ''>('')
const message = computed(() =>
  loginDetailsMessage(props.clinicName, `${window.location.origin}/login`, props.email, props.password))

async function copy(text: string, which: 'password' | 'message') {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => { copied.value = '' }, 2000)
  } catch { /* clipboard blocked: the password is selectable on screen */ }
}
</script>
