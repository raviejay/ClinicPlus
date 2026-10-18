<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <nav class="bg-white border-b border-gray-100 px-6 py-4">
      <RouterLink to="/"><AppLogo size="sm" /></RouterLink>
    </nav>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-black tracking-tight text-slate-900 mb-1">Choose a new password</h1>
          <p class="text-slate-400 text-sm">You will sign in with it straight after.</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <div v-if="state === 'checking'" class="flex items-center justify-center py-8" role="status">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- The link was opened without a valid recovery session: expired, already used, or not from an email -->
          <div v-else-if="state === 'invalid'" class="text-center space-y-4" role="alert">
            <div class="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <span class="material-icons text-amber-500 text-3xl">link_off</span>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">This link is no longer valid</p>
              <p class="text-xs text-slate-500 mt-1">Reset links work once and expire after a while. Ask for a new one.</p>
            </div>
            <RouterLink to="/forgot-password"
              class="inline-block bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Send a new link
            </RouterLink>
          </div>

          <form v-else @submit.prevent="submit" class="space-y-4" novalidate>
            <PasswordInput id="new-password" v-model="password" label="New password" autocomplete="new-password" placeholder="At least 8 characters">
              <template #hint><PasswordStrength :password="password" /></template>
            </PasswordInput>
            <PasswordInput id="confirm-password" v-model="confirm" label="Confirm new password" autocomplete="new-password" />

            <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span class="material-icons text-red-500 text-[18px]">error_outline</span>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button type="submit" :disabled="saving"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
              {{ saving ? 'Saving…' : 'Change password' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import { checkPassword, friendlyAuthError } from '@/utils/auth'
import AppLogo from '@/components/AppLogo.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import PasswordStrength from '@/components/ui/PasswordStrength.vue'

const router = useRouter()

const state = ref<'checking' | 'ready' | 'invalid'>('checking')
const password = ref('')
const confirm = ref('')
const saving = ref(false)
const errorMsg = ref('')

// Opening the emailed link signs the person in with a short recovery session. Give it a moment to arrive.
let waitTimer: number | undefined
let subscription: { unsubscribe: () => void } | null = null

onMounted(async () => {
  const listener = authService.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
      state.value = 'ready'
      window.clearTimeout(waitTimer)
    }
  })
  subscription = listener.data?.subscription ?? null

  if (await authService.getSession()) { state.value = 'ready'; return }
  waitTimer = window.setTimeout(() => { if (state.value === 'checking') state.value = 'invalid' }, 4000)
})

onBeforeUnmount(() => {
  window.clearTimeout(waitTimer)
  subscription?.unsubscribe()
})

async function submit() {
  if (saving.value) return
  errorMsg.value = ''
  const check = checkPassword(password.value)
  if (!check.ok) { errorMsg.value = check.label || 'Choose a password.'; return }
  if (password.value !== confirm.value) { errorMsg.value = 'Passwords do not match.'; return }

  saving.value = true
  const { error } = await authService.updatePassword(password.value)
  if (error) {
    saving.value = false
    errorMsg.value = friendlyAuthError(error)
    return
  }
  // Sign out everywhere, so signing in again proves the new password works
  await authService.logout()
  router.replace({ path: '/login', query: { reset: '1' } })
}
</script>
