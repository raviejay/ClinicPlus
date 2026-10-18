<template>
  <!-- Nothing is drawn unless a Cloudflare Turnstile site key is configured -->
  <div v-if="enabled" class="flex justify-center min-h-[65px]">
    <div ref="host" aria-label="Human check"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ''
const enabled = siteKey.length > 0

const emit = defineEmits<{
  (e: 'verified', token: string): void
  /** The token ran out or the check failed: the form must wait for a new one */
  (e: 'reset'): void
}>()

const host = ref<HTMLElement | null>(null)
let widgetId: string | undefined

// One script tag shared by every widget on every page
let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = SCRIPT_SRC
    tag.async = true
    tag.onload = () => resolve()
    tag.onerror = () => { scriptPromise = null; reject(new Error('Could not load the human check')) }
    document.head.appendChild(tag)
  })
  return scriptPromise
}

onMounted(async () => {
  if (!enabled || !host.value) return
  try {
    await loadScript()
    if (!host.value || !window.turnstile) return
    widgetId = window.turnstile.render(host.value, {
      sitekey: siteKey,
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('reset'),
      'error-callback': () => emit('reset'),
      'timeout-callback': () => emit('reset'),
    })
  } catch {
    emit('reset')
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

// A token works once: ask for a fresh one after every attempt
function reset() {
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  emit('reset')
}

defineExpose({ reset, enabled })
</script>
