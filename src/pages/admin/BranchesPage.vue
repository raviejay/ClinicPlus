<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Branches</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ branches.length }} branch{{ branches.length !== 1 ? 'es' : '' }}</p>
        </div>
        <button @click="openAdd"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <span class="material-icons text-sm">add</span>
          Add Branch
        </button>
      </div>

      <FeatureGate feature="multi_branch" label="Multi-Branch" required-plan="Premium">

        <div v-if="loading" class="flex justify-center py-12">
          <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="branches.length === 0"
          class="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <span class="material-icons text-5xl text-slate-200">store</span>
          <p class="text-sm font-semibold text-slate-700 mt-3">No branches yet</p>
          <p class="text-xs text-slate-400 mt-1">Add your clinic branches to manage them separately</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="branch in branches" :key="branch.id"
            class="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">

            <div class="flex items-start gap-3 min-w-0">
              <div class="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center shrink-0">
                <span class="material-icons text-sky-500">store</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-900">{{ branch.name }}</p>
                <p v-if="branch.address" class="text-xs text-slate-400 mt-0.5">
                  <span class="material-icons text-xs align-middle">location_on</span>
                  {{ branch.address }}
                </p>
                <p v-if="branch.contact_number" class="text-xs text-slate-400 mt-0.5">
                  <span class="material-icons text-xs align-middle">phone</span>
                  {{ branch.contact_number }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button @click="openEdit(branch)"
                class="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors">
                <span class="material-icons text-sm">edit</span>
              </button>
              <button @click="handleDelete(branch)"
                class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <span class="material-icons text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>

      </FeatureGate>

    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="showModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">

          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">{{ editingBranch ? 'Edit Branch' : 'Add Branch' }}</h2>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="p-5 space-y-4">

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Branch Name <span class="text-red-400">*</span>
              </label>
              <input v-model="form.name" type="text" placeholder="e.g. Main Branch, North Branch"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Address</label>
              <input v-model="form.address" type="text" placeholder="Street, Barangay, City"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Contact Number</label>
              <input v-model="form.contact_number" type="tel" placeholder="09XXXXXXXXX"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
              <p class="text-xs text-red-600">{{ errorMsg }}</p>
            </div>

            <button @click="handleSave" :disabled="saving || !form.name"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
              {{ saving ? 'Saving…' : editingBranch ? 'Save Changes' : 'Add Branch' }}
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
import { branchService } from '@/services/branch.service'
import AppLayout from '@/layouts/AppLayout.vue'
import FeatureGate from '@/components/ui/FeatureGate.vue'
import type { Branch } from '@/types'

const authStore = useAuthStore()
const branchStore = useBranchStore()

const branches = ref<Branch[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const editingBranch = ref<Branch | null>(null)

const form = ref({ name: '', address: '', contact_number: '' })

async function loadBranches() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await branchService.getAll(authStore.clinic.id)
  branches.value = data ?? []
  loading.value = false
}

function openAdd() {
  editingBranch.value = null
  form.value = { name: '', address: '', contact_number: '' }
  errorMsg.value = ''
  showModal.value = true
}

function openEdit(branch: Branch) {
  editingBranch.value = branch
  form.value = { name: branch.name, address: branch.address ?? '', contact_number: branch.contact_number ?? '' }
  errorMsg.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBranch.value = null
  errorMsg.value = ''
}

async function handleSave() {
  if (!authStore.clinic?.id || !form.value.name) return
  saving.value = true
  errorMsg.value = ''

  const payload = {
    name: form.value.name,
    address: form.value.address || undefined,
    contact_number: form.value.contact_number || undefined,
  }

  const { error } = editingBranch.value
    ? await branchService.update(authStore.clinic.id, editingBranch.value.id, payload)
    : await branchService.create(authStore.clinic.id, payload)

  saving.value = false
  if (error) { errorMsg.value = error; return }

  await loadBranches()
  await branchStore.loadBranches()
  closeModal()
}

async function handleDelete(branch: Branch) {
  if (!authStore.clinic?.id) return
  if (!confirm(`Delete "${branch.name}"? This cannot be undone.`)) return
  await branchService.remove(authStore.clinic.id, branch.id)
  await loadBranches()
  await branchStore.loadBranches()
}

onMounted(loadBranches)
</script>