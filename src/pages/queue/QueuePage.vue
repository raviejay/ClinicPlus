<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Queue</h1>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ today }} •
            <span class="text-green-600 font-semibold">{{ waitingCount }} waiting</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Realtime indicator -->
          <div class="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span class="text-xs font-semibold text-green-700">Live</span>
          </div>

          <button @click="openTVDisplay"
            class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors shadow-sm">
            <span class="material-icons text-[18px]">tv</span>
            <span class="hidden sm:inline">TV Display</span>
          </button>

          <button @click="showAddModal = true"
            class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
            <span class="material-icons text-[18px]">add</span>
            Add
          </button>
        </div>
      </div>

      <!-- Feature gate -->
      <FeatureGate feature="queue" label="Queue Management" required-plan="Pro or Premium">
        <div class="space-y-4">

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span class="hidden sm:flex w-10 h-10 rounded-xl bg-amber-50 text-amber-500 items-center justify-center shrink-0">
                <span class="material-icons text-[22px]">hourglass_top</span>
              </span>
              <div class="min-w-0">
                <p class="text-2xl font-black leading-none text-amber-500">{{ counts.waiting }}</p>
                <p class="text-xs text-slate-400 mt-1 truncate">
                  Waiting<template v-if="longestWait >= 1"> · longest {{ waitLabel(longestWait) }}</template>
                </p>
              </div>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span class="hidden sm:flex w-10 h-10 rounded-xl bg-sky-50 text-sky-500 items-center justify-center shrink-0">
                <span class="material-icons text-[22px]">medical_services</span>
              </span>
              <div>
                <p class="text-2xl font-black leading-none text-sky-500">{{ counts.now_serving }}</p>
                <p class="text-xs text-slate-400 mt-1">Serving</p>
              </div>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span class="hidden sm:flex w-10 h-10 rounded-xl bg-green-50 text-green-500 items-center justify-center shrink-0">
                <span class="material-icons text-[22px]">task_alt</span>
              </span>
              <div>
                <p class="text-2xl font-black leading-none text-green-500">{{ counts.done }}</p>
                <p class="text-xs text-slate-400 mt-1">Done today</p>
              </div>
            </div>
          </div>

          <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <template v-else>
            <!-- Phones and tablets: pick a list. Wide screens show them side by side -->
            <div class="flex gap-1 bg-slate-100 p-1 rounded-xl lg:hidden" role="tablist" aria-label="Queue lists">
              <button v-for="tab in tabs" :key="tab.value" role="tab" :aria-selected="activeTab === tab.value" @click="activeTab = tab.value"
                :class="[
                  'flex-1 text-xs font-semibold py-2 rounded-lg transition-colors',
                  activeTab === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                ]">
                {{ tab.label }}
                <span v-if="tab.count > 0" class="ml-1 text-xs">{{ tab.count }}</span>
              </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-5 lg:items-start">

              <!-- Left: who is being served, and who is next -->
              <div :class="['lg:col-span-3 space-y-4', activeTab === 'waiting' ? 'block' : 'hidden lg:block']">

                <!-- Now serving -->
                <section v-if="nowServing" aria-label="Now serving"
                  class="rounded-2xl p-5 text-white shadow-lg shadow-sky-200/60 bg-gradient-to-br from-sky-500 to-sky-600">
                  <p class="text-[11px] font-bold opacity-80 mb-3 uppercase tracking-[0.2em]">Now serving</p>
                  <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-3xl shrink-0">
                      {{ nowServing.priority_number }}
                    </div>
                    <div class="min-w-0">
                      <p class="font-black text-xl leading-tight truncate">{{ nowServing.patients?.full_name }}</p>
                      <p class="text-sm opacity-80">{{ nowServing.patients?.contact_number }}</p>
                    </div>
                  </div>
                  <div class="flex flex-col sm:flex-row gap-2 mt-5">
                    <button @click="markDone(nowServing)" :disabled="busy"
                      class="flex-1 bg-white text-sky-600 text-sm font-black px-4 py-2.5 rounded-xl hover:bg-sky-50 disabled:opacity-60 transition-colors">
                      Mark done ✓
                    </button>
                    <button v-if="nextUp" @click="doneAndCallNext(nowServing)" :disabled="busy"
                      class="flex-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                      {{ busy ? 'Working…' : `Done & call #${nextUp.priority_number}` }}
                    </button>
                  </div>
                </section>

                <!-- Nobody being served, someone waiting -->
                <section v-else-if="nextUp" aria-label="Call next patient"
                  class="rounded-2xl border-2 border-dashed border-green-300 bg-green-50/60 p-5">
                  <p class="text-[11px] font-bold text-green-700 mb-3 uppercase tracking-[0.2em]">Up next</p>
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-white border border-green-200 rounded-2xl flex items-center justify-center font-black text-2xl text-green-600 shrink-0">
                      {{ nextUp.priority_number }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-black text-lg text-slate-900 leading-tight truncate">{{ nextUp.patients?.full_name }}</p>
                      <p class="text-xs text-slate-500">Waiting {{ waitLabel(waitFor(nextUp)) }}</p>
                    </div>
                  </div>
                  <button @click="handleCallNext" :disabled="calling"
                    class="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl transition-all text-base shadow-md shadow-green-200">
                    {{ calling ? 'Calling…' : 'Call next patient →' }}
                  </button>
                </section>

                <!-- All clear -->
                <section v-else aria-label="Queue is clear" class="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <div class="text-4xl mb-2">{{ counts.done > 0 ? '🎉' : '😴' }}</div>
                  <p class="text-sm font-bold text-slate-700">{{ counts.done > 0 ? 'Queue is clear' : 'No one in the queue yet' }}</p>
                  <p class="text-xs text-slate-400 mt-1">
                    {{ counts.done > 0 ? `${counts.done} patient${counts.done === 1 ? '' : 's'} seen today.` : 'Add a walk-in, or check patients in from Appointments.' }}
                  </p>
                </section>

                <!-- Waiting list -->
                <section aria-label="Waiting">
                  <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Waiting <span class="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[11px]">{{ waitingList.length }}</span>
                  </h2>
                  <div v-if="waitingList.length === 0" class="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-slate-400">
                    No one waiting
                  </div>
                  <ul v-else class="space-y-2">
                    <li v-for="(item, i) in waitingList" :key="item.id"
                      class="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 bg-amber-50 text-amber-600">
                        {{ item.priority_number }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-900 truncate">
                          {{ item.patients?.full_name }}
                          <span v-if="i === 0" class="ml-1.5 text-[10px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5 align-middle">Next</span>
                        </p>
                        <p class="text-xs text-slate-400">{{ item.patients?.contact_number }}</p>
                      </div>
                      <span :class="['hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', TONE_CLASS[waitTone(waitFor(item))]]"
                        :title="`In the queue for ${waitLabel(waitFor(item))}`">
                        <span class="material-icons text-[13px]">schedule</span>{{ waitLabel(waitFor(item)) }}
                      </span>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button @click="callSpecific(item)" :disabled="busy"
                          class="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                          Call
                        </button>
                        <button @click="skipItem(item)" :disabled="busy"
                          class="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                          Skip
                        </button>
                      </div>
                    </li>
                  </ul>
                </section>
              </div>

              <!-- Right: what has happened today -->
              <div :class="['lg:col-span-2 space-y-4', activeTab === 'waiting' ? 'hidden lg:block' : 'block']">

                <section :class="activeTab === 'done' ? 'block' : 'hidden lg:block'" aria-label="Done">
                  <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Done <span class="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-[11px]">{{ doneList.length }}</span>
                  </h2>
                  <div v-if="doneList.length === 0" class="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-slate-400">
                    No completed visits yet
                  </div>
                  <ul v-else class="space-y-2">
                    <li v-for="item in doneList" :key="item.id"
                      class="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 bg-green-50 text-green-600">{{ item.priority_number }}</div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-900 truncate">{{ item.patients?.full_name }}</p>
                        <p class="text-xs text-slate-400">{{ item.patients?.contact_number }}</p>
                      </div>
                      <span class="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full shrink-0">Done</span>
                    </li>
                  </ul>
                </section>

                <section v-if="skippedList.length > 0 || activeTab === 'skipped'" :class="activeTab === 'skipped' ? 'block' : 'hidden lg:block'" aria-label="Skipped">
                  <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Skipped <span class="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-[11px]">{{ skippedList.length }}</span>
                  </h2>
                  <div v-if="skippedList.length === 0" class="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-slate-400">
                    No one was skipped
                  </div>
                  <ul v-else class="space-y-2">
                    <li v-for="item in skippedList" :key="item.id"
                      class="bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 bg-slate-100 text-slate-400">{{ item.priority_number }}</div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-600 truncate">{{ item.patients?.full_name }}</p>
                        <p class="text-xs text-slate-400">{{ item.patients?.contact_number }}</p>
                      </div>
                      <button @click="putBack(item)" :disabled="busy"
                        class="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-60">
                        Put back
                      </button>
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </template>

        </div>
      </FeatureGate>

    </div>

    <!-- Add to queue modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">Add to Queue</h2>
            <button @click="showAddModal = false" aria-label="Close" class="text-slate-400 hover:text-slate-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <PatientLookup
              ref="patientLookupRef"
              v-model="selectedPatient"
              label="Find patient"
              required
            />

            <div v-if="addError" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {{ addError }}
            </div>

            <button @click="handleAddToQueue"
              :disabled="addingToQueue"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQueueRealtime } from '@/composables/useQueueRealtime'
import { queueService } from '@/services/queue.service'
import { patientService } from '@/services/patient.service'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { waitLabel, waitMinutes, waitTone } from '@/utils/queue'
import AppLayout from '@/layouts/AppLayout.vue'
import FeatureGate from '@/components/ui/FeatureGate.vue'
import PatientLookup from '@/components/ui/PatientLookup.vue'
import type { Patient } from '@/types'
import type { QueueWithPatient } from '@/services/queue.service'

const router = useRouter()
const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const calling = ref(false)
// One queue action at a time, so quick double taps can't call or skip twice
const busy = ref(false)
const showAddModal = ref(false)
const addingToQueue = ref(false)
const addError = ref('')
const selectedPatient = ref<Patient | null>(null)
const patientLookupRef = ref<InstanceType<typeof PatientLookup> | null>(null)
const activeTab = ref<'waiting' | 'done' | 'skipped'>('waiting')

const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

const TONE_CLASS = {
  ok: 'bg-slate-100 text-slate-500',
  long: 'bg-amber-50 text-amber-700',
  'very-long': 'bg-red-50 text-red-600',
} as const

// ── Realtime queue state ───────────────────────────────────────────────────
const clinicId = authStore.clinic?.id ?? ''
const { queue, loading, nowServing, counts, loadQueue, subscribe } =
  useQueueRealtime(clinicId)

// Waiting times tick along without any reloading
const now = ref(new Date())
const clock = window.setInterval(() => { now.value = new Date() }, 30_000)
onBeforeUnmount(() => window.clearInterval(clock))
const waitFor = (item: QueueWithPatient) => waitMinutes(item.created_at, now.value)

// ── Computed ───────────────────────────────────────────────────────────────
const waitingCount = computed(() => counts.value.waiting)

const waitingList = computed(() =>
  queue.value.filter(q => q.status === 'waiting').sort((a, b) => a.priority_number - b.priority_number))
const nextUp = computed(() => waitingList.value[0] ?? null)
const longestWait = computed(() => waitingList.value.reduce((max, q) => Math.max(max, waitFor(q)), 0))
const doneList = computed(() =>
  queue.value.filter(q => q.status === 'done').sort((a, b) => b.priority_number - a.priority_number))
const skippedList = computed(() =>
  queue.value.filter(q => q.status === 'skipped').sort((a, b) => a.priority_number - b.priority_number))

const tabs = computed(() => [
  { label: 'Waiting', value: 'waiting' as const, count: counts.value.waiting },
  { label: 'Done',    value: 'done' as const,    count: counts.value.done },
  ...(skippedList.value.length ? [{ label: 'Skipped', value: 'skipped' as const, count: skippedList.value.length }] : []),
])

// ── TV Display ─────────────────────────────────────────────────────────────
function openTVDisplay() {
  router.push({ name: 'queue-tv' })
}

// ── Queue actions ──────────────────────────────────────────────────────────
// After any write we let Realtime push the update. We still reload once as a
// safeguard for operations that touch multiple rows.

async function guarded(work: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  try { await work() } finally { busy.value = false }
}

async function handleCallNext() {
  if (!authStore.clinic?.id || calling.value) return
  calling.value = true
  await queueService.callNext(authStore.clinic.id, authStore.profile?.id)
  await loadQueue()
  calling.value = false
}

const callSpecific = (item: QueueWithPatient) => guarded(async () => {
  if (!authStore.clinic?.id) return
  if (nowServing.value) {
    await queueService.updateStatus(authStore.clinic.id, nowServing.value.id, 'done')
  }
  await queueService.updateStatus(authStore.clinic.id, item.id, 'now_serving', authStore.profile?.id ?? undefined)
  await loadQueue()
  activeTab.value = 'waiting'
})

const markDone = (item: QueueWithPatient) => guarded(async () => {
  if (!authStore.clinic?.id) return
  await queueService.markDoneWithAppointment(authStore.clinic.id, item)
  await loadQueue()
  activeTab.value = 'waiting'
})

// Finish the current patient and bring in the next one in a single tap
const doneAndCallNext = (item: QueueWithPatient) => guarded(async () => {
  if (!authStore.clinic?.id) return
  await queueService.markDoneWithAppointment(authStore.clinic.id, item)
  await queueService.callNext(authStore.clinic.id, authStore.profile?.id)
  await loadQueue()
  activeTab.value = 'waiting'
})

const skipItem = (item: QueueWithPatient) => guarded(async () => {
  if (!authStore.clinic?.id) return
  await queueService.updateStatus(authStore.clinic.id, item.id, 'skipped')
  await loadQueue()
})

// A skipped patient who turned up after all goes back to their original place
const putBack = (item: QueueWithPatient) => guarded(async () => {
  if (!authStore.clinic?.id) return
  await queueService.updateStatus(authStore.clinic.id, item.id, 'waiting')
  await loadQueue()
  activeTab.value = 'waiting'
})

async function handleAddToQueue() {
  if (!authStore.clinic?.id) return
  addingToQueue.value = true
  addError.value = ''

  let patientId: string

  if (selectedPatient.value) {
    patientId = selectedPatient.value.id
  } else {
    const newData = patientLookupRef.value?.getNewPatientData()
    if (!newData) {
      addError.value = 'Search and select a patient, or register a new one'
      addingToQueue.value = false
      return
    }
    const { data, error } = await patientService.findOrCreate(authStore.clinic.id, newData)
    if (error || !data) {
      addError.value = error ?? 'Could not create patient'
      addingToQueue.value = false
      return
    }
    patientId = data.id
  }

  const { error } = await queueService.addToQueue({
    clinic_id: authStore.clinic.id,
    patient_id: patientId,
  })

  addingToQueue.value = false

  if (error) {
    addError.value = error
    return
  }

  await loadQueue()

  selectedPatient.value = null
  showAddModal.value = false
  activeTab.value = 'waiting'
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadQueue()
  subscribe()

  watchBranchChange(async () => {
    await loadQueue()
  })
})
</script>
