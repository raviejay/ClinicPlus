<template>
  <AppLayout>
    <div class="space-y-5">

      <div class="flex items-center gap-3">
        <RouterLink to="/dashboard" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Clinic Settings</h1>
      </div>

      <!-- Clinic info -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-bold text-slate-900 mb-4">Clinic Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Clinic Name</label>
            <input v-model="form.name" type="text"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
            <input v-model="form.email" type="email"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Booking URL slug</label>
            <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-slate-50">
              <span class="px-3 py-3 text-xs text-slate-400 border-r border-gray-200 whitespace-nowrap">clinicgo.app/book/</span>
              <input v-model="form.slug" type="text"
                class="flex-1 px-3 py-3 text-sm text-sky-600 font-mono bg-transparent focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <!-- Booking settings -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-bold text-slate-900 mb-4">Booking Configuration</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Booking Mode</label>
            <select v-model="settingsForm.booking_mode"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
              <option value="auto_assign">Auto-assign (system picks doctor)</option>
              <option value="doctor_selection">Doctor selection (patient picks)</option>
              <option value="hybrid" :disabled="!canUseFeature('multi_branch')">Hybrid (Premium only)</option>
            </select>
          </div>

          <!-- Toggle settings -->
          <div class="space-y-3 pt-1">
            <div v-for="toggle in toggleSettings" :key="toggle.key"
              class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p class="text-sm font-medium text-slate-700">{{ toggle.label }}</p>
                <p class="text-xs text-slate-400">{{ toggle.desc }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="toggle.planRequired && !canUseFeature(toggle.key)"
                  class="text-xs text-slate-300 font-semibold">{{ toggle.planRequired }}</span>
                <button
                  @click="toggleSetting(toggle.key)"
                  :disabled="!!toggle.planRequired && !canUseFeature(toggle.key)"
                  :class="[
                    'relative w-10 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
                    settingsForm[toggle.key as keyof typeof settingsForm] ? 'bg-sky-500' : 'bg-gray-200'
                  ]">
                  <span :class="[
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    settingsForm[toggle.key as keyof typeof settingsForm] ? 'translate-x-4' : 'translate-x-0'
                  ]"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save -->
      <div v-if="successMsg" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-green-700 font-medium">{{ successMsg }}</p>
      </div>

      <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-red-600">{{ errorMsg }}</p>
      </div>

      <button @click="saveSettings" :disabled="saving"
        class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
        {{ saving ? 'Saving…' : 'Save Settings' }}
      </button>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import { supabase } from '@/services/supabase'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()
const { canUseFeature } = useClinic()

const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const form = ref({
  name: authStore.clinic?.name ?? '',
  email: authStore.clinic?.email ?? '',
  slug: authStore.clinic?.slug ?? '',
})

const settingsForm = ref({
  booking_mode: authStore.clinicSettings?.booking_mode ?? 'auto_assign',
  queue_enabled: authStore.clinicSettings?.queue_enabled ?? false,
  sms_enabled: authStore.clinicSettings?.sms_enabled ?? false,
  multi_branch_enabled: authStore.clinicSettings?.multi_branch_enabled ?? false,
})

const toggleSettings = [
  { key: 'queue_enabled',        label: 'Queue system',     desc: 'Enable walk-in queue management',          planRequired: 'Pro+' },
  { key: 'sms_enabled',          label: 'SMS notifications', desc: 'Send SMS reminders to patients',          planRequired: 'Pro+' },
  { key: 'multi_branch_enabled', label: 'Multi-branch',     desc: 'Operate multiple clinic branches',         planRequired: 'Premium' },
]

function toggleSetting(key: string) {
  const k = key as keyof typeof settingsForm.value
  if (typeof settingsForm.value[k] === 'boolean') {
    (settingsForm.value[k] as boolean) = !(settingsForm.value[k] as boolean)
  }
}

async function saveSettings() {
  if (!authStore.clinic?.id) return
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  const clinicId = authStore.clinic.id

  const [clinicRes, settingsRes] = await Promise.all([
    supabase.from('clinics')
      .update({ name: form.value.name, email: form.value.email, slug: form.value.slug })
      .eq('id', clinicId),
    supabase.from('clinic_settings')
      .update(settingsForm.value)
      .eq('clinic_id', clinicId),
  ])

  saving.value = false

  if (clinicRes.error || settingsRes.error) {
    errorMsg.value = clinicRes.error?.message ?? settingsRes.error?.message ?? 'Failed to save.'
    return
  }

  // Refresh store
  await authStore.loadClinic(clinicId)
  successMsg.value = 'Settings saved successfully.'
  setTimeout(() => successMsg.value = '', 3000)
}
</script>