<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">

    <nav class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <RouterLink to="/">
        <AppLogo size="sm" />
      </RouterLink>
      <p class="text-sm text-slate-400">
        No account yet?
        <RouterLink to="/register" class="text-sky-500 font-semibold hover:text-sky-600 transition-colors">Sign up free</RouterLink>
      </p>
    </nav>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">

        <div class="mb-8 text-center">
          <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-1">Welcome back</h1>
          <p class="text-slate-400 text-sm">Sign in to your ClinicGo dashboard</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <form @submit.prevent="handleLogin" class="space-y-4">

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="you@clinic.com"
                required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
                <a href="#" class="text-xs text-sky-500 hover:text-sky-600 transition-colors">Forgot password?</a>
              </div>
              <input
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-sm shadow-md shadow-sky-200 mt-2">
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>

          </form>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6">
          Trusted by clinics across the Philippines 🇵🇭
        </p>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/AppLogo.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ email: '', password: '' })
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  const { error } = await authStore.login(form.value.email, form.value.password)
  loading.value = false
  if (error) { errorMsg.value = error; return }
  if (!authStore.profile?.clinic_id) {
    router.push('/clinic-setup')
  } else {
    router.push('/dashboard')
  }
}
</script>