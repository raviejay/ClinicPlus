<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <nav class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <RouterLink to="/"><AppLogo size="sm" /></RouterLink>
      <RouterLink to="/login" class="text-sm text-sky-500 font-semibold hover:text-sky-600 transition-colors">Back to sign in</RouterLink>
    </nav>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-1">Forgot your password?</h1>
          <p class="text-slate-400 text-sm">Enter your email and we will send you a link to choose a new one.</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <!-- Same message whether or not the email has an account, so this page cannot be used to find out who is registered -->
          <div v-if="sent" role="status" class="space-y-4 text-center">
            <div class="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto">
              <span class="material-icons text-sky-500 text-3xl">mark_email_read</span>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">Check your email</p>
              <p class="text-xs text-slate-500 mt-1">
                If an account exists for <strong>{{ email.trim() }}</strong>, a reset link is on its way. It can take a few minutes. Check your spam folder too.
              </p>
            </div>
            <button type="button" @click="again" :disabled="cooldown > 0"
              class="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:text-slate-400 disabled:cursor-not-allowed">
              {{ cooldown > 0 ? `Send again in ${cooldown}s` : 'Send it again' }}
            </button>
          </div>

          <form v-else @submit.prevent="submit" class="space-y-4" novalidate>
            <div>
              <label for="forgot-email" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
              <input id="forgot-email" v-model="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none"
                spellcheck="false" placeholder="you@clinic.com" required
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all bg-slate-50 focus:bg-white" />
            </div>

            <TurnstileWidget ref="captcha" @verified="captchaToken = $event" @reset="captchaToken = ''" />

            <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span class="material-icons text-red-500 text-[18px]">error_outline</span>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button type="submit" :disabled="loading || !captchaReady"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
              {{ loading ? 'Sending…' : 'Send reset link' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { authService } from '@/services/auth.service'
import { friendlyAuthError, isEmail } from '@/utils/auth'
import AppLogo from '@/components/AppLogo.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'

const RESEND_SECONDS = 60

const email = ref('')
const sent = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const cooldown = ref(0)

const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const captchaToken = ref('')
const captchaReady = computed(() => !captcha.value?.enabled || captchaToken.value !== '')

let timer: number | undefined
function startCooldown() {
  cooldown.value = RESEND_SECONDS
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) window.clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => window.clearInterval(timer))

async function submit() {
  if (loading.value) return
  errorMsg.value = ''
  if (!isEmail(email.value)) { errorMsg.value = 'Enter the email you signed up with.'; return }

  loading.value = true
  const { error } = await authService.requestPasswordReset(email.value, captchaToken.value || undefined)
  loading.value = false
  captcha.value?.reset()

  // Only problems that are about this request, not about the account, are shown (limits, network, captcha)
  if (error && /rate limit|too many|captcha|fetch|network/i.test(error)) {
    errorMsg.value = friendlyAuthError(error)
    return
  }
  sent.value = true
  startCooldown()
}

// Back to the form for another go (a fresh human check is needed for each request)
function again() {
  sent.value = false
  captchaToken.value = ''
}
</script>
