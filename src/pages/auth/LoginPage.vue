<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-gray-900 mb-6">Welcome back</h2>
    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="form-label">Email</label>
        <input v-model="form.email" type="email" class="input-field" placeholder="you@clinic.com" required />
      </div>
      <div>
        <label class="form-label">Password</label>
        <input v-model="form.password" type="password" class="input-field" placeholder="••••••••" required />
      </div>
      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign In' }}
      </button>
    </form>
    <p class="text-center text-sm text-gray-500 mt-4">
      No account?
      <RouterLink to="/register" class="text-blue-600 font-medium hover:underline">Sign up free</RouterLink>
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
