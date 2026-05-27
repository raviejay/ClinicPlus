<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Queue</h1>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ today }} •
            <span class="text-green-600 font-semibold">{{ waitingCount }} waiting</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Realtime indicator -->
          <div class="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span class="text-xs font-semibold text-green-700">Live</span>
          </div>
          <button @click="showAddModal = true"
            class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Add
          </button>
        </div>
      </div>

      <!-- Feature gate -->
      <FeatureGate feature="queue" label="Queue Management" required-plan="Pro or Premium">
        <div class="space-y-4">

          <!-- Stats row -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p class="text-xl font-black text-amber-500">{{ counts.waiting }}</p>
              <p class="text-xs text-slate-400 mt-0.5">Waiting</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p class="text-xl font-black text-sky-500">{{ counts.now_serving }}</p>
              <p class="text-xs text-slate-400 mt-0.5">Serving</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p class="text-xl font-black text-green-500">{{ counts.done }}</p>
              <p class="text-xs text-slate-400 mt-0.5">Done</p>
            </div>
          </div>

          <!-- Now serving banner -->
          <div v-if="nowServing" class="bg-sky-500 rounded-2xl p-4 text-white">
            <p class="text-xs font-semibold opacity-75 mb-1 uppercase tracking-widest">Now Serving</p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-black text-2xl">
                  {{ nowServing.priority_number }}
                </div>
                <div>
                  <p class="font-black text-lg leading-tight">{{ nowServing.patients?.full_name }}</p>
                  <p class="text-xs opacity-75">{{ nowServing.patients?.contact_number }}</p>
                </div>
              </div>
              <button @click="markDone(nowServing)"
                class="bg-white text-sky-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-sky-50 transition-colors">
                Done ✓
              </button>
            </div>
          </div>

          <!-- Call next button -->
          <button v-if="counts.waiting > 0 && !nowServing" @click="handleCallNext"
            :disabled="calling"
            class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all text-base shadow-md shadow-green-200">
            {{ calling ? 'Calling…' : `Call Next Patient →` }}
          </button>

          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-10">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Queue list tabs -->
          <div v-else>
            <div class="flex gap-1 bg-slate-100 p-1 rounded-xl mb-3">
              <button v-for="tab in tabs" :key="tab.value" @click="activeTab = tab.value"
                :class="[
                  'flex-1 text-xs font-semibold py-2 rounded-lg transition-colors',
                  activeTab === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                ]">
                {{ tab.label }}
                <span v-if="tab.count > 0" class="ml-1 text-xs">{{ tab.count }}</span>
              </button>
            </div>

            <!-- Empty state -->
            <div v-if="filteredQueue.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <div class="text-3xl mb-3">{{ activeTab === 'waiting' ? '😴' : activeTab === 'now_serving' ? '🩺' : '✅' }}</div>
              <p class="text-sm font-semibold text-slate-600">
                {{ activeTab === 'waiting' ? 'No one waiting' : activeTab === 'now_serving' ? 'No active consultation' : 'No completed visits yet' }}
              </p>
            </div>

            <!-- Queue items -->
            <div v-else class="space-y-2">
              <div v-for="item in filteredQueue" :key="item.id"
                :class="[
                  'bg-white border rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all',
                  item.status === 'now_serving' ? 'border-sky-300 shadow-sm' : 'border-gray-200'
                ]">

                <!-- Number badge -->
                <div :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0',
                  item.status === 'waiting'     ? 'bg-amber-50 text-amber-600' :
                  item.status === 'now_serving' ? 'bg-sky-50 text-sky-600' :
                  item.status === 'done'        ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'
                ]">
                  {{ item.priority_number }}
                </div>

                <!-- Patient info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 truncate">{{ item.patients?.full_name }}</p>
                  <p class="text-xs text-slate-400">{{ item.patients?.contact_number }}</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <span v-if="item.status === 'done'"
                    class="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    Done
                  </span>
                  <span v-else-if="item.status === 'now_serving'"
                    class="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                    Serving
                  </span>
                  <div v-else-if="item.status === 'waiting'" class="flex items-center gap-1.5">
                    <button @click="callSpecific(item)"
                      class="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors">
                      Call
                    </button>
                    <button @click="skipItem(item)"
                      class="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </FeatureGate>

    </div>

    <!-- Add to queue modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">Add to Queue</h2>
            <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Contact Number <span class="text-red-400">*</span>
              </label>
              <div class="flex gap-2">
                <input v-model="addForm.contact_number" type="tel" placeholder="09XXXXXXXXX"
                  class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
                <button @click="lookupForQueue" :disabled="!addForm.contact_number || lookingUp"
                  class="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-semibold px-4 rounded-xl transition-colors">
                  {{ lookingUp ? '…' : 'Find' }}
                </button>
              </div>
            </div>

            <!-- Patient found/new -->
            <div v-if="addForm.patient" class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                {{ addForm.patient.full_name.charAt(0) }}
              </div>
              <div>
                <p class="text-sm font-semibold text-green-800">{{ addForm.patient.full_name }}</p>
                <p class="text-xs text-green-600">{{ addForm.isNew ? 'New patient' : 'Returning patient' }}</p>
              </div>
            </div>

            <!-- Name if new -->
            <div v-if="addForm.showNameField">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Full Name <span class="text-red-400">*</span>
              </label>
              <input v-model="addForm.full_name" type="text" placeholder="Juan Dela Cruz"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
            </div>

            <div v-if="addError" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {{ addError }}
            </div>

            <button @click="handleAddToQueue"
              :disabled="addingToQueue || !addForm.contact_number || (addForm.showNameField && !addForm.full_name)"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm">
              {{ addingToQueue ? 'Adding…' : 'Add to Queue' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { queueService, type QueueWithPatient } from '@/services/queue.service'
import { patientService } from '@/services/patient.service'
import AppLayout from '@/layouts/AppLayout.vue'
import FeatureGate from '@/components/ui/FeatureGate.vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Patient } from '@/types'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const queue = ref<QueueWithPatient[]>([])
const loading = ref(true)
const calling = ref(false)
const showAddModal = ref(false)
const addingToQueue = ref(false)
const lookingUp = ref(false)
const addError = ref('')
const activeTab = ref<'waiting' | 'now_serving' | 'done'>('waiting')
let realtimeChannel: RealtimeChannel | null = null

const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

const addForm = ref<{
  contact_number: string
  full_name: string
  patient: Patient | null
  isNew: boolean
  showNameField: boolean
}>({
  contact_number: '', full_name: '', patient: null, isNew: false, showNameField: false
})

const tabs = computed(() => [
  { label: 'Waiting',  value: 'waiting' as const,     count: counts.value.waiting },
  { label: 'Serving',  value: 'now_serving' as const,  count: counts.value.now_serving },
  { label: 'Done',     value: 'done' as const,         count: counts.value.done },
])

const counts = computed(() => ({
  waiting:     queue.value.filter(q => q.status === 'waiting').length,
  now_serving: queue.value.filter(q => q.status === 'now_serving').length,
  done:        queue.value.filter(q => q.status === 'done').length,
}))

const waitingCount = computed(() => counts.value.waiting)

const nowServing = computed(() =>
  queue.value.find(q => q.status === 'now_serving') ?? null
)

const filteredQueue = computed(() =>
  queue.value.filter(q => q.status === activeTab.value)
)

async function loadQueue() {
  if (!authStore.clinic?.id) return
  loading.value = true
  const { data } = await queueService.getTodayQueue(authStore.clinic.id)
  queue.value = data ?? []
  loading.value = false
}

async function handleCallNext() {
  if (!authStore.clinic?.id) return
  calling.value = true
  await queueService.callNext(authStore.clinic.id, authStore.profile?.id)
  await loadQueue()
  calling.value = false
}

async function callSpecific(item: QueueWithPatient) {
  if (!authStore.clinic?.id) return
  // Mark any current "now_serving" as done first
  if (nowServing.value) {
    await queueService.updateStatus(authStore.clinic.id, nowServing.value.id, 'done')
  }
  await queueService.updateStatus(authStore.clinic.id, item.id, 'now_serving', authStore.profile?.id ?? undefined)
  await loadQueue()
  activeTab.value = 'now_serving'
}

async function markDone(item: QueueWithPatient) {
  if (!authStore.clinic?.id) return
  await queueService.updateStatus(authStore.clinic.id, item.id, 'done')
  await loadQueue()
  activeTab.value = 'waiting'
}

async function skipItem(item: QueueWithPatient) {
  if (!authStore.clinic?.id) return
  await queueService.updateStatus(authStore.clinic.id, item.id, 'skipped')
  await loadQueue()
}

async function lookupForQueue() {
  if (!authStore.clinic?.id || !addForm.value.contact_number) return
  lookingUp.value = true
  addForm.value.patient = null
  addForm.value.showNameField = false

  // Search for existing patient
  const { data } = await patientService.search(authStore.clinic.id, addForm.value.contact_number)
  const exact = data?.find(p => p.contact_number === addForm.value.contact_number)

  lookingUp.value = false

  if (exact) {
    addForm.value.patient = exact
    addForm.value.isNew = false
  } else {
    addForm.value.isNew = true
    addForm.value.showNameField = true
  }
}

async function handleAddToQueue() {
  if (!authStore.clinic?.id) return
  addingToQueue.value = true
  addError.value = ''

  let patientId: string

  if (addForm.value.patient) {
    patientId = addForm.value.patient.id
  } else {
    const { data, error } = await patientService.findOrCreate(authStore.clinic.id, {
      full_name: addForm.value.full_name,
      contact_number: addForm.value.contact_number,
    })
    if (error || !data) { addError.value = error ?? 'Could not create patient'; addingToQueue.value = false; return }
    patientId = data.id
  }

  const { error } = await queueService.addToQueue({
    clinic_id: authStore.clinic.id,
    patient_id: patientId,
  })

  addingToQueue.value = false

  if (error) { addError.value = error; return }

  // Reset and close
  addForm.value = { contact_number: '', full_name: '', patient: null, isNew: false, showNameField: false }
  showAddModal.value = false
  activeTab.value = 'waiting'
}

onMounted(async () => {
  await loadQueue()

  // Subscribe to realtime updates
  if (authStore.clinic?.id) {
    realtimeChannel = queueService.subscribeToQueue(authStore.clinic.id, async () => {
      await loadQueue()
    })
  }

  watchBranchChange(async () => {
    await loadQueue()
  })
})

onUnmounted(() => {
  realtimeChannel?.unsubscribe()
})
</script>