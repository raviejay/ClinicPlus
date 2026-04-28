<template>
  <AppLayout>
    <div class="space-y-4">

      <h1 class="text-xl font-black tracking-tight text-slate-900">My Profile</h1>

      <!-- Avatar section -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <div class="flex items-center gap-4">
          <div class="relative">
            <img v-if="avatarUrl" :src="avatarUrl"
              class="w-16 h-16 rounded-full object-cover border-2 border-sky-100" />
            <div v-else
              class="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white font-black text-2xl">
              {{ userInitial }}
            </div>
            <button @click="triggerUpload"
              class="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 hover:bg-sky-600 rounded-full flex items-center justify-center shadow-md transition-colors">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </div>
          <div>
            <p class="font-black text-slate-900">{{ authStore.profile?.full_name ?? 'No name set' }}</p>
            <p class="text-xs text-slate-400 capitalize">{{ authStore.profile?.role }}</p>
            <p class="text-xs text-slate-400">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <div v-if="uploadMsg" class="mt-3 text-xs text-green-600 font-medium">{{ uploadMsg }}</div>
        <div v-if="uploadError" class="mt-3 text-xs text-red-500">{{ uploadError }}</div>
        <div v-if="uploading" class="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <div class="w-3 h-3 border border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          Uploading…
        </div>
      </div>

      <!-- Edit name -->
      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-900">Personal Info</h2>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
          <input v-model="nameForm.full_name" type="text" placeholder="Your full name"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
          <input :value="authStore.user?.email" type="email" disabled
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
          <p class="text-xs text-slate-300 mt-1">Email cannot be changed.</p>
        </div>

        <div v-if="nameSuccess" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-green-700 font-medium">Name updated!</p>
        </div>

        <button @click="saveName" :disabled="savingName"
          class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
          {{ savingName ? 'Saving…' : 'Save Name' }}
        </button>
      </div>

      <!-- Change password -->
      <div class="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-900">Change Password</h2>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">New Password</label>
          <input v-model="passwordForm.password" type="password" placeholder="Min. 6 characters" minlength="6"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Confirm Password</label>
          <input v-model="passwordForm.confirm" type="password" placeholder="••••••••"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
        </div>

        <div v-if="passwordError" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-red-600">{{ passwordError }}</p>
        </div>

        <div v-if="passwordSuccess" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-green-700 font-medium">Password updated successfully!</p>
        </div>

        <button @click="changePassword" :disabled="savingPassword || !passwordForm.password"
          class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
          {{ savingPassword ? 'Updating…' : 'Update Password' }}
        </button>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/services/supabase'
import AppLayout from '@/layouts/AppLayout.vue'

const authStore = useAuthStore()

const avatarUrl = ref<string | null>(null)
const uploading = ref(false)
const uploadMsg = ref('')
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const nameForm = ref({ full_name: authStore.profile?.full_name ?? '' })
const savingName = ref(false)
const nameSuccess = ref(false)

const passwordForm = ref({ password: '', confirm: '' })
const savingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

const userInitial = computed(() => {
  const name = authStore.profile?.full_name ?? authStore.user?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})

function triggerUpload() {
  fileInput.value?.click()
}

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !authStore.user?.id) return

  uploadError.value = ''
  uploadMsg.value = ''
  uploading.value = true

  const ext = file.name.split('.').pop()
  const path = `avatars/${authStore.user.id}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) {
    uploadError.value = error.message
    uploading.value = false
    return
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  avatarUrl.value = data.publicUrl + '?t=' + Date.now()
  uploadMsg.value = 'Photo updated!'
  uploading.value = false
}

async function saveName() {
  if (!authStore.user?.id) return
  savingName.value = true
  nameSuccess.value = false

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: nameForm.value.full_name })
    .eq('id', authStore.user.id)

  savingName.value = false
  if (!error) {
    nameSuccess.value = true
    await authStore.loadProfile(authStore.user.id)
    setTimeout(() => nameSuccess.value = false, 3000)
  }
}

async function changePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  if (passwordForm.value.password !== passwordForm.value.confirm) {
    passwordError.value = 'Passwords do not match.'
    return
  }
  if (passwordForm.value.password.length < 6) {
    passwordError.value = 'Password must be at least 6 characters.'
    return
  }

  savingPassword.value = true
  const { error } = await supabase.auth.updateUser({ password: passwordForm.value.password })
  savingPassword.value = false

  if (error) { passwordError.value = error.message; return }

  passwordSuccess.value = true
  passwordForm.value = { password: '', confirm: '' }
  setTimeout(() => passwordSuccess.value = false, 3000)
}

onMounted(async () => {
  if (!authStore.user?.id) return
  // Try to load existing avatar
  const { data } = supabase.storage.from('avatars').getPublicUrl(`avatars/${authStore.user.id}.jpg`)
  // Check if it exists by fetching
  try {
    const res = await fetch(data.publicUrl, { method: 'HEAD' })
    if (res.ok) avatarUrl.value = data.publicUrl + '?t=' + Date.now()
  } catch {}
})
</script>