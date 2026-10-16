<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex gap-1" role="group" aria-label="Document type">
        <button v-for="f in KIND_FILTERS" :key="f.key" type="button" :aria-pressed="kindFilter === f.key" @click="kindFilter = f.key"
          :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-colors', kindFilter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-500 hover:border-slate-300']">{{ f.label }}</button>
      </div>
      <div class="flex gap-1" role="group" aria-label="Status">
        <button v-for="f in STATUS_FILTERS" :key="f.key" type="button" :aria-pressed="statusFilter === f.key" @click="statusFilter = f.key"
          :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-colors', statusFilter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-500 hover:border-slate-300']">{{ f.label }}</button>
      </div>
      <div class="relative flex-1 sm:max-w-xs sm:ml-auto">
        <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input v-model="search" type="search" placeholder="Patient or number…" aria-label="Search documents"
          class="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100" />
      </div>
    </div>

    <p v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ error }}</p>

    <div v-if="loading" class="py-12 flex justify-center" aria-busy="true">
      <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="docs.length === 0" class="bg-white border border-gray-200 rounded-2xl p-10 text-center">
      <span class="material-icons text-4xl text-slate-300">folder_open</span>
      <p class="font-semibold text-slate-600 mt-2">{{ filtersActive ? 'No documents match' : 'No documents issued yet' }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ filtersActive ? 'Try a different search or filter.' : 'Certificates and prescriptions you issue will be kept here.' }}</p>
    </div>

    <ul v-else class="space-y-2">
      <li v-for="d in docs" :key="d.id">
        <button type="button" @click="selected = d"
          class="w-full text-left bg-white border border-gray-200 hover:border-sky-300 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors">
          <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0', d.kind === 'medcert' ? 'bg-sky-50 text-sky-500' : 'bg-purple-50 text-purple-500']">
            <span class="material-icons text-[20px]">{{ DOC_KINDS[d.kind].icon }}</span></div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 truncate" :class="d.status === 'voided' && 'line-through text-slate-400'">{{ d.patient_name }}</p>
            <p class="text-xs text-slate-400 truncate">
              <span class="font-mono">{{ d.number }}</span> · {{ DOC_KINDS[d.kind].label }} · {{ manilaDateTimeLabel(d.issued_at) }}
              <template v-if="d.issuer?.full_name"> · {{ d.issuer.full_name }}</template></p>
          </div>
          <span v-if="d.status === 'voided'" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Voided</span>
        </button>
      </li>
      <li v-if="docs.length >= LIMIT" class="text-center text-xs text-slate-400 pt-1">Showing the latest {{ LIMIT }}. Use the search to find older ones.</li>
    </ul>

    <!-- One document -->
    <div v-if="selected" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="doc-title" @click.self="closeDetail">
      <div class="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col">
        <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div class="min-w-0">
            <h2 id="doc-title" class="font-bold text-slate-900 truncate">{{ selected.patient_name }}</h2>
            <p class="text-xs text-slate-400"><span class="font-mono">{{ selected.number }}</span> · {{ DOC_KINDS[selected.kind].label }} · {{ manilaDateTimeLabel(selected.issued_at) }}</p>
          </div>
          <button type="button" aria-label="Close" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0" @click="closeDetail">
            <span class="material-icons">close</span></button>
        </div>

        <div class="overflow-y-auto p-5 space-y-4">
          <div v-if="selected.status === 'voided'" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="font-bold text-xs uppercase tracking-wide mb-1">Voided<template v-if="selected.voided_at"> · {{ manilaDateTimeLabel(selected.voided_at) }}</template></p>
            <p>{{ selected.void_reason }}</p>
          </div>
          <div class="bg-slate-200/70 rounded-2xl p-4 flex justify-center">
            <DocumentPreview :layout="selected.layout" :data="selected.data" :logo-url="selected.data.logoUrl" :max-width="520" />
          </div>

          <form v-if="voiding" class="space-y-2" @submit.prevent="confirmVoid">
            <label for="void-reason" class="block text-xs font-semibold text-slate-700">Why is this being voided? <span class="text-red-400">*</span></label>
            <textarea id="void-reason" v-model="reason" rows="2" maxlength="300" required placeholder="e.g. Issued to the wrong patient"
              class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"></textarea>
            <p class="text-[11px] text-slate-400">The document stays on record, marked as voided with your reason. Anything printed already should be destroyed.</p>
            <p v-if="voidError" role="alert" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ voidError }}</p>
            <div class="flex gap-2">
              <button type="button" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm" :disabled="busy" @click="voiding = false">Back</button>
              <button type="submit" :disabled="busy || reason.trim().length < 3"
                class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-sm">{{ busy ? 'Saving…' : 'Confirm void' }}</button>
            </div>
          </form>
        </div>

        <div v-if="!voiding" class="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-2">
          <button type="button" class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800" @click="print(selected!)">
            <span class="material-icons text-[16px]">print</span>Reprint</button>
          <button v-if="canVoid" type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-bold hover:bg-slate-50" @click="voiding = true">Void</button>
          <p v-else-if="selected.status === 'issued'" class="text-[11px] text-slate-400 self-center">Only an admin can void this document.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { documentService, type IssuedDocument } from '@/services/document.service'
import { parseDbTimestamp } from '@/utils/billing'
import { buildPrintHtml } from '@/utils/documents/render'
import { DOC_KINDS, type DocKind } from '@/utils/documents/types'
import { printHtmlDocument } from '@/utils/receipt'
import { manilaDateTimeLabel } from '@/utils/revenue'
import DocumentPreview from './DocumentPreview.vue'

const LIMIT = 200
const KIND_FILTERS: { key: DocKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'medcert', label: 'Certificates' }, { key: 'prescription', label: 'Prescriptions' },
]
const STATUS_FILTERS: { key: 'issued' | 'voided' | 'all'; label: string }[] = [
  { key: 'issued', label: 'Issued' }, { key: 'voided', label: 'Voided' }, { key: 'all', label: 'All' },
]

const auth = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const docs = ref<IssuedDocument[]>([])
const loading = ref(true)
const error = ref('')
const kindFilter = ref<DocKind | 'all'>('all')
const statusFilter = ref<'issued' | 'voided' | 'all'>('issued')
const search = ref('')
const selected = ref<IssuedDocument | null>(null)

const voiding = ref(false)
const reason = ref('')
const busy = ref(false)
const voidError = ref('')

const filtersActive = computed(() => kindFilter.value !== 'all' || statusFilter.value !== 'issued' || !!search.value.trim())

let request = 0
async function load() {
  const clinicId = auth.clinic?.id
  if (!clinicId) return
  const id = ++request
  loading.value = true
  error.value = ''
  const { data, error: err } = await documentService.listIssued(clinicId, {
    kind: kindFilter.value === 'all' ? undefined : kindFilter.value,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    search: search.value,
  }, LIMIT)
  if (id !== request) return
  loading.value = false
  if (err) error.value = err
  docs.value = data ?? []
}

// Same rules as the database: admins any time, the issuer within 15 minutes
const canVoid = computed(() => {
  const d = selected.value
  if (!d || d.status !== 'issued') return false
  if (auth.isAdmin) return true
  return d.issued_by === auth.user?.id && Date.now() - parseDbTimestamp(d.issued_at).getTime() < 15 * 60_000
})

function print(doc: IssuedDocument) {
  printHtmlDocument(buildPrintHtml(doc.layout, doc.data, { clinicLogoUrl: doc.data.logoUrl, title: doc.number }))
}

function closeDetail() {
  if (busy.value) return
  selected.value = null
  voiding.value = false
  reason.value = ''
  voidError.value = ''
}

async function confirmVoid() {
  const d = selected.value
  if (!d || busy.value || reason.value.trim().length < 3) return
  busy.value = true
  voidError.value = ''
  const { error: err } = await documentService.void(d.id, reason.value.trim())
  busy.value = false
  if (err) { voidError.value = err; return }
  closeDetail()
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([kindFilter, statusFilter], load)
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 250) })

onMounted(() => {
  load()
  watchBranchChange(load)
})
</script>
