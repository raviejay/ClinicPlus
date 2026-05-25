<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Team</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ staff.length }} member{{ staff.length !== 1 ? 's' : '' }}</p>
        </div>
        <button @click="openAdd"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <span class="material-icons text-sm">add</span>
          Add
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="staff.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <span class="material-icons text-5xl text-slate-200">group</span>
        <p class="text-sm font-semibold text-slate-700 mt-3">No team members yet</p>
        <p class="text-xs text-slate-400 mt-1">Add doctors and staff to get started</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="member in staff" :key="member.id"
          class="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3">

          <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
            member.role === 'doctor' ? 'bg-sky-100 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600']">
            {{ (member.full_name ?? 'U').charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 truncate">
              {{ member.full_name ?? 'Unnamed' }}
              <span v-if="member.id === authStore.user?.id" class="text-xs text-slate-300 font-normal ml-1">(you)</span>
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <p class="text-xs text-slate-400 capitalize">{{ member.role }}</p>
              <span v-if="getBranchName(member.branch_id)" class="text-xs text-slate-300">·</span>
              <p v-if="getBranchName(member.branch_id)" class="text-xs text-sky-500 font-medium">
                {{ getBranchName(member.branch_id) }}
              </p>
              <p v-else-if="branches.length > 0" class="text-xs text-slate-300">All branches</p>
            </div>
          </div>

          <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full shrink-0',
            member.role === 'doctor' ? 'bg-sky-50 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500']">
            {{ member.role }}
          </span>

          <!-- Edit branch assignment -->
          <button v-if="member.id !== authStore.user?.id"
            @click="openEdit(member)"
            class="p-1.5 text-slate-300 hover:text-sky-400 hover:bg-sky-50 rounded-lg transition-colors shrink-0">
            <span class="material-icons text-sm">edit</span>
          </button>

          <button v-if="member.id !== authStore.user?.id && member.role !== 'admin'"
            @click="handleRemove(member)"
            class="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Add / Edit modal -->
    <Teleport to="body">
      <div v-if="showModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">

          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">{{ editingMember ? 'Edit Member' : 'Add Team Member' }}</h2>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="p-5 space-y-4">

            <!-- Show credentials after creation -->
            <template v-if="createdCredentials">
              <div class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span class="material-icons text-green-500 text-sm">check_circle</span>
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
                      <span class="material-icons text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
              <p class="text-xs text-slate-400 text-center">They can change their password after logging in.</p>
              <button @click="closeModal" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                Done
              </button>
            </template>

            <!-- Add form -->
            <template v-else-if="!editingMember">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name <span class="text-red-400">*</span></label>
                <input v-model="form.full_name" type="text" placeholder="Dr. Juan Dela Cruz"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email <span class="text-red-400">*</span></label>
                <input v-model="form.email" type="email" placeholder="doctor@clinic.com"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Role</label>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="form.role = 'doctor'" :class="['py-3 rounded-xl text-sm font-semibold border transition-colors', form.role === 'doctor' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">🩺 Doctor</button>
                  <button @click="form.role = 'staff'" :class="['py-3 rounded-xl text-sm font-semibold border transition-colors', form.role === 'staff' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">🧑‍💼 Staff</button>
                </div>
              </div>

              <!-- Branch assignment -->
              <div v-if="branches.length > 0">
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Assign to Branch
                  <span class="text-slate-300 normal-case font-normal">(optional)</span>
                </label>
                <select v-model="form.branch_id"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
                  <option value="">All branches (no restriction)</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
                </select>
                <p class="text-xs text-slate-400 mt-1">Staff/doctors will only see data from their assigned branch.</p>
              </div>

              <div class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p class="text-xs text-amber-700">A temporary password will be generated. Share it with the user after creation.</p>
              </div>
            </template>

            <!-- Edit branch assignment only -->
            <template v-else>
              <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-2">
                <div :class="['w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                  editingMember.role === 'doctor' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-600']">
                  {{ (editingMember.full_name ?? 'U').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ editingMember.full_name }}</p>
                  <p class="text-xs text-slate-400 capitalize">{{ editingMember.role }}</p>
                </div>
              </div>

              <div v-if="branches.length > 0">
                <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Assign to Branch</label>
                <select v-model="form.branch_id"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
                  <option value="">All branches (no restriction)</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
                </select>
              </div>
              <div v-else class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p class="text-xs text-slate-500">No branches created yet. Go to <RouterLink to="/admin/branches" class="text-sky-500 font-semibold">Branches</RouterLink> to add one first.</p>
              </div>
            </template>

            <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button v-if="!createdCredentials"
              @click="editingMember ? handleUpdateBranch() : handleAdd()"
              :disabled="saving || (!editingMember && (!form.full_name || !form.email))"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
              {{ saving ? 'Saving…' : editingMember ? 'Save Branch Assignment' : 'Add Team Member' }}
            </button>

          </div>
        </div>
      </div>
    </Teleport>

  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { staffService } from '@/services/staff.service'
import { branchService } from '@/services/branch.service'
import { supabase } from '@/services/supabase'
import AppLayout from '@/layouts/AppLayout.vue'
import type { Profile, Branch } from '@/types'

const authStore = useAuthStore()
const branchStore = useBranchStore()

const staff = ref<Profile[]>([])
const branches = ref<Branch[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const createdCredentials = ref<{ password: string } | null>(null)
const editingMember = ref<Profile | null>(null)

const form = ref({ full_name: '', email: '', role: 'doctor' as 'doctor' | 'staff', branch_id: '' })

function getBranchName(branchId: string | null) {
  if (!branchId) return null
  return branches.value.find(b => b.id === branchId)?.name ?? null
}

async function loadStaff() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await staffService.getAll(authStore.clinic.id)
  staff.value = data ?? []
  loading.value = false
}

async function loadBranches() {
  if (!authStore.clinic?.id) return
  const { data } = await branchService.getAll(authStore.clinic.id)
  branches.value = data ?? []
}

function openAdd() {
  editingMember.value = null
  form.value = { full_name: '', email: '', role: 'doctor', branch_id: '' }
  errorMsg.value = ''
  createdCredentials.value = null
  showModal.value = true
}

function openEdit(member: Profile) {
  editingMember.value = member
  form.value = { full_name: member.full_name ?? '', email: '', role: member.role as 'doctor' | 'staff', branch_id: member.branch_id ?? '' }
  errorMsg.value = ''
  createdCredentials.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingMember.value = null
  errorMsg.value = ''
  createdCredentials.value = null
  form.value = { full_name: '', email: '', role: 'doctor', branch_id: '' }
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

  if (error) { errorMsg.value = error; saving.value = false; return }

  // Assign branch if selected
  if (data && form.value.branch_id && authStore.clinic?.id) {
    // Update the profile branch_id after creation
    await supabase.from('profiles')
      .update({ branch_id: form.value.branch_id })
      .eq('clinic_id', authStore.clinic.id)
      .eq('full_name', form.value.full_name)
  }

  saving.value = false
  createdCredentials.value = data
  await loadStaff()
}

async function handleUpdateBranch() {
  if (!authStore.clinic?.id || !editingMember.value) return
  saving.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('profiles')
    .update({ branch_id: form.value.branch_id || null })
    .eq('id', editingMember.value.id)
    .eq('clinic_id', authStore.clinic.id)

  saving.value = false
  if (error) { errorMsg.value = error.message; return }

  await loadStaff()
  await branchStore.loadBranches()
  closeModal()
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

onMounted(async () => {
  await Promise.all([loadStaff(), loadBranches()])
})
</script>