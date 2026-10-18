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
          <div v-if="resetDone" role="status" class="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
            <span class="material-icons text-green-500 text-[18px]">check_circle</span>
            <p class="text-xs text-green-700">Your password was changed. Sign in with the new one.</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4" novalidate>

            <div>
              <label for="login-email" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                id="login-email"
                v-model="form.email"
                type="email"
                inputmode="email"
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
                placeholder="you@clinic.com"
                required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <PasswordInput id="login-password" v-model="form.password" autocomplete="current-password">
              <template #aside>
                <RouterLink to="/forgot-password" class="text-xs text-sky-500 hover:text-sky-600 transition-colors">Forgot password?</RouterLink>
              </template>
            </PasswordInput>

            <TurnstileWidget ref="captcha" @verified="captchaToken = $event" @reset="captchaToken = ''" />

            <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <div v-if="waitLeft > 0" role="status" class="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <span class="material-icons text-amber-500 text-[18px]">lock_clock</span>
              <p class="text-xs text-amber-800">
                Too many wrong attempts. You can try again in <strong>{{ waitLeft }}s</strong>.
                <RouterLink to="/forgot-password" class="underline font-semibold">Reset your password</RouterLink> if you have forgotten it.
              </p>
            </div>

            <button
              type="submit"
              :disabled="loading || waitLeft > 0 || !captchaReady"
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
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, DEACTIVATED_MESSAGE } from '@/stores/auth'
import { friendlyAuthError, isEmail, lockoutSeconds } from '@/utils/auth'
import AppLogo from '@/components/AppLogo.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({ email: '', password: '' })
// Sent here after an admin deactivated the account while it was signed in
const errorMsg = ref(route.query.deactivated ? DEACTIVATED_MESSAGE : '')
const resetDone = computed(() => route.query.reset === '1')
const loading = ref(false)

// The human check: when it is switched on, signing in waits for a token
const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const captchaToken = ref('')
const captchaReady = computed(() => !captcha.value?.enabled || captchaToken.value !== '')

// A short pause after repeated wrong passwords. This is a courtesy to the person at the keyboard;
// the real protection is Supabase's own rate limit and the human check.
const failures = ref(0)
const waitLeft = ref(0)
let timer: number | undefined
function startWait(seconds: number) {
  waitLeft.value = seconds
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    waitLeft.value -= 1
    if (waitLeft.value <= 0) window.clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => window.clearInterval(timer))

async function handleLogin() {
  if (loading.value || waitLeft.value > 0) return
  errorMsg.value = ''
  if (!isEmail(form.value.email)) { errorMsg.value = 'Enter the email you signed up with.'; return }
  if (!form.value.password) { errorMsg.value = 'Enter your password.'; return }

  loading.value = true
  const { error } = await authStore.login(form.value.email.trim(), form.value.password, captchaToken.value || undefined)
  loading.value = false

  if (error) {
    // A token can be used once, so ask for a new check after every attempt
    captcha.value?.reset()
    // Only wrong credentials count towards the pause, not a network blip or a deactivated account
    if (/invalid login credentials/i.test(error)) {
      failures.value += 1
      const wait = lockoutSeconds(failures.value)
      if (wait) startWait(wait)
    }
    errorMsg.value = error === DEACTIVATED_MESSAGE ? error : friendlyAuthError(error)
    return
  }

  failures.value = 0
  if (!authStore.profile?.clinic_id) {
    router.push('/clinic-setup')
  } else {
    router.push('/dashboard')
  }
}
</script>
