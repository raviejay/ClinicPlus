<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
    <p class="text-sm text-gray-500 mb-6">Start your 14-day free trial</p>
    <form @submit.prevent="handleRegister" class="space-y-4">
      <div>
        <label class="form-label">Email</label>
        <input v-model="form.email" type="email" class="input-field" placeholder="you@clinic.com" required />
      </div>
      <div>
        <label class="form-label">Password</label>
        <input v-model="form.password" type="password" class="input-field" placeholder="Min. 6 characters" minlength="6" required />
      </div>
      <div>
        <label class="form-label">Confirm Password</label>
        <input v-model="form.confirm" type="password" class="input-field" placeholder="••••••••" required />
      </div>
      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Create Account' }}
      </button>
    </form>
    <p class="text-center text-sm text-gray-500 mt-4">
      Already have an account?
      <RouterLink to="/login" class="text-blue-600 font-medium hover:underline">Sign in</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ email: '', password: '', confirm: '' })
const errorMsg = ref('')
const loading = ref(false)

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
