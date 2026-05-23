<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">

    <nav class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <RouterLink to="/">
        <AppLogo size="sm" />
      </RouterLink>
      <p class="text-sm text-slate-400">
        Already have an account?
        <RouterLink to="/login" class="text-sky-500 font-semibold hover:text-sky-600 transition-colors">Sign in</RouterLink>
      </p>
    </nav>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">

        <div class="mb-8 text-center">
          <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-1">Create your account</h1>
          <div class="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mt-2">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            14 days free — full Premium access
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <form @submit.prevent="handleRegister" class="space-y-4">

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
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                v-model="form.password"
                type="password"
                placeholder="Min. 6 characters"
                minlength="6"
                required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <input
                v-model="form.confirm"
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
              {{ loading ? 'Creating account…' : "Create Account — It's Free" }}
            </button>

          </form>

          <div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px bg-gray-100"></div>
            <span class="text-xs text-slate-300">what you get</span>
            <div class="flex-1 h-px bg-gray-100"></div>
          </div>

          <ul class="space-y-2">
            <li v-for="perk in perks" :key="perk" class="flex items-center gap-2 text-xs text-slate-500">
              <span class="text-green-500 font-bold">✓</span> {{ perk }}
            </li>
          </ul>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6">
          By signing up you agree to our Terms of Service.
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

const form = ref({ email: '', password: '', confirm: '' })
const errorMsg = ref('')
const loading = ref(false)

const perks = [
  'Full Premium access for 14 days',
  'Appointment booking + public page',
  'Queue management system',
  'Revenue tracking dashboard',
  'No credit card required',
]

async function handleRegister() {
  errorMsg.value = ''
  if (form.value.password !== form.value.confirm) {
    errorMsg.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  const { error } = await authStore.signup(form.value.email, form.value.password)
  loading.value = false
  if (error) { errorMsg.value = error; return }
  router.push('/clinic-setup')
}
</script>