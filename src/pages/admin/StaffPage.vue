<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Team</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ staff.length }} member{{ staff.length !== 1 ? 's' : '' }}</p>
        </div>
        <button @click="showModal = true"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="staff.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <div class="text-3xl mb-3">👥</div>
        <p class="text-sm font-semibold text-slate-700">No team members yet</p>
        <p class="text-xs text-slate-400 mt-1">Add doctors and staff to get started</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="member in staff" :key="member.id"
          class="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div :class="[
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
            member.role === 'doctor' ? 'bg-sky-100 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-100 text-purple-600' :
                                       'bg-slate-100 text-slate-600'
          ]">
            {{ (member.full_name ?? 'U').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 truncate">
              {{ member.full_name ?? 'Unnamed' }}
              <span v-if="member.id === authStore.user?.id" class="text-xs text-slate-300 font-normal ml-1">(you)</span>
            </p>
            <p class="text-xs text-slate-400 capitalize">{{ member.role }}</p>
          </div>
          <span :class="[
            'text-xs font-semibold px-2.5 py-1 rounded-full shrink-0',
            member.role === 'doctor' ? 'bg-sky-50 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-50 text-purple-600' :
                                       'bg-slate-100 text-slate-500'
          ]">{{ member.role }}</span>
          <button
            v-if="member.id !== authStore.user?.id && member.role !== 'admin'"
            @click="handleRemove(member)"
            class="text-slate-300 hover:text-red-400 transition-colors shrink-0 ml-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

    </div>

    <!-- Add modal -->
    <Teleport to="body">
      <div v-if="showModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">

          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">Add Team Member</h2>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4">

            <!-- Success: show credentials -->
            <div v-if="createdCredentials" class="space-y-3">
              <div class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-xs text-green-700 font-medium">Account created! Share these credentials:</p>
              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-400">Email</span>
                  <span class="text-xs font-mono font-semibold text-slate-700">{{ form.email }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-400">Password</span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-semibold text-slate-700">{{ createdCredentials.password }}</span>
                    <button @click="copyPassword" class="text-sky-500 hover:text-sky-600">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <p class="text-xs text-slate-400 text-center">They can change their password after logging in.</p>

              <button @click="closeModal"
                class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                Done
              </button>
            </div>

            <!-- Form -->
            <template v-else>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Full Name <span class="text-red-400">*</span>
                </label>
                <input v-model="form.full_name" type="text" placeholder="Dr. Juan Dela Cruz"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Email <span class="text-red-400">*</span>
                </label>
                <input v-model="form.email" type="email" placeholder="doctor@clinic.com"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Role</label>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="form.role = 'doctor'"
                    :class="[
                      'py-3 rounded-xl text-sm font-semibold border transition-colors',
                      form.role === 'doctor' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'
                    ]">🩺 Doctor</button>
                  <button @click="form.role = 'staff'"
                    :class="[
                      'py-3 rounded-xl text-sm font-semibold border transition-colors',
                      form.role === 'staff' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300'
                    ]">🧑‍💼 Staff</button>
                </div>
              </div>

              <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-xs text-red-600">{{ errorMsg }}</p>
              </div>

              <button @click="handleAdd" :disabled="saving || !form.full_name || !form.email"
                class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
                {{ saving ? 'Creating account…' : 'Add Team Member' }}
              </button>
            </template>

          </div>
        </div>
      </div>
    </Teleport>

  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { staffService } from '@/services/staff.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Profile } from '@/types'

const authStore = useAuthStore()

const staff = ref<Profile[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const createdCredentials = ref<{ password: string } | null>(null)

const form = ref({ full_name: '', email: '', role: 'doctor' as 'doctor' | 'staff' })

async function loadStaff() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await staffService.getAll(authStore.clinic.id)
  staff.value = data ?? []
  loading.value = false
}

async function handleAdd() {
  if (!authStore.clinic?.id) return
  saving.value = true
  errorMsg.value = ''

  const { data, error } = await staffService.invite(authStore.clinic.id, {
    email: form.value.email,
    full_name: form.value.full_name,
    role: form.value.role,
  })

  saving.value = false

  if (error) { errorMsg.value = error; return }

  createdCredentials.value = data
  await loadStaff()
}

async function handleRemove(member: Profile) {
  if (!authStore.clinic?.id) return
  if (!confirm(`Remove ${member.full_name} from the clinic?`)) return
  await staffService.remove(authStore.clinic.id, member.id)
  await loadStaff()
}

async function copyPassword() {
  if (createdCredentials.value) {
    await navigator.clipboard.writeText(createdCredentials.value.password)
  }
}

function closeModal() {
  showModal.value = false
  errorMsg.value = ''
  createdCredentials.value = null
  form.value = { full_name: '', email: '', role: 'doctor' }
}

onMounted(loadStaff)
</script>