<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">

    <nav class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <AppLogo size="sm" />
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        <span class="text-xs text-slate-400 font-medium">Step 2 of 2</span>
      </div>
    </nav>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">

        <div class="mb-8 text-center">
          <div class="w-14 h-14 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-sky-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21v-6a1 1 0 011-1h4a1 1 0 011 1v6"/>
            </svg>
          </div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-1">Set up your clinic</h1>
          <p class="text-slate-400 text-sm">Takes less than a minute. Promise.</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <form @submit.prevent="handleSetup" class="space-y-4">

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Clinic Name <span class="text-red-400 normal-case">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Smile Dental Clinic"
                required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Clinic Email <span class="text-slate-300 normal-case font-normal">(optional)</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                placeholder="clinic@example.com"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div v-if="form.name" class="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
              <p class="text-xs text-slate-400 mb-1">Your booking page will be at:</p>
              <p class="text-xs font-mono font-semibold text-sky-600 break-all">
                cliniko.app/book/{{ slugPreview }}
              </p>
            </div>

            <div class="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <svg class="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-green-700">
                You'll get <strong>14 days of full Premium</strong> — queue, revenue tracking, branding, everything. No credit card.
              </p>
            </div>

            <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading || !form.name.trim()"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-sm shadow-md shadow-sky-200 mt-2">
              {{ loading ? 'Creating your clinic…' : 'Create Clinic & Go to Dashboard' }}
            </button>

          </form>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import AppLogo from '@/components/AppLogo.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ name: '', email: '' })
const errorMsg = ref('')
const loading = ref(false)

const slugPreview = computed(() =>
  form.value.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || '...'
)

async function handleSetup() {
  if (!authStore.user) return
  errorMsg.value = ''
  loading.value = true
  const { data, error } = await clinicService.createClinic(authStore.user.id, {
    name: form.value.name,
    email: form.value.email || undefined
  })
  loading.value = false
  if (error) { errorMsg.value = error; return }
  if (data) await authStore.loadProfile(authStore.user.id)
  router.push('/dashboard')
}
</script>