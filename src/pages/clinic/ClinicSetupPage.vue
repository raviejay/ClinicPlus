<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-gray-900 mb-1">Set up your clinic</h2>
    <p class="text-sm text-gray-500 mb-6">This takes less than a minute</p>
    <form @submit.prevent="handleSetup" class="space-y-4">
      <div>
        <label class="form-label">Clinic Name <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" class="input-field" placeholder="e.g. City Health Clinic" required />
      </div>
      <div>
        <label class="form-label">Clinic Email <span class="text-gray-400">(optional)</span></label>
        <input v-model="form.email" type="email" class="input-field" placeholder="clinic@example.com" />
      </div>

      <!-- Trial info banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-800">
        <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>You'll get a <strong>14-day free trial</strong> on the Starter plan. No credit card required.</span>
      </div>

      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Creating clinic…' : 'Create Clinic & Continue' }}
      </button>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ name: '', email: '' })
const errorMsg = ref('')
const loading = ref(false)

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
