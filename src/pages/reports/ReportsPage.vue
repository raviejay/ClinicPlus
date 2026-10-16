<template>
  <AppLayout>
    <div class="space-y-5">

      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Reports</h1>
        <p class="text-sm text-slate-400 mt-0.5">Issue, reprint and design your clinic's certificates and prescriptions</p>
      </div>

      <div class="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Reports sections">
        <button v-for="t in TABS" :key="t.key" type="button" role="tab" :aria-selected="tab === t.key" @click="setTab(t.key)"
          :class="['flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors',
            tab === t.key ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600']">
          <span class="material-icons text-[18px]">{{ t.icon }}</span>{{ t.label }}
        </button>
      </div>

      <IssueDocument v-if="tab === 'issue'" :initial-patient-id="patientParam" :initial-kind="kindParam" @show-history="setTab('history')" />
      <DocumentHistory v-else-if="tab === 'history'" />
      <TemplateManager v-else />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import type { DocKind } from '@/utils/documents/types'
import DocumentHistory from './DocumentHistory.vue'
import IssueDocument from './IssueDocument.vue'
import TemplateManager from './TemplateManager.vue'

type Tab = 'issue' | 'history' | 'templates'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'issue', label: 'Issue a document', icon: 'edit_document' },
  { key: 'history', label: 'History', icon: 'history' },
  { key: 'templates', label: 'Templates', icon: 'design_services' },
]

const route = useRoute()
const router = useRouter()

const text = (v: unknown) => (typeof v === 'string' ? v : undefined)
const tab = computed<Tab>(() => {
  const t = text(route.query.tab)
  return t === 'history' || t === 'templates' ? t : 'issue'
})

// Opened from a patient's chart: ?patient=<id>&kind=medcert|prescription
const patientParam = computed(() => text(route.query.patient))
const kindParam = computed<DocKind | undefined>(() => {
  const k = text(route.query.kind)
  return k === 'medcert' || k === 'prescription' ? k : undefined
})

function setTab(next: Tab) {
  router.replace({ query: next === 'issue' ? {} : { tab: next } })
}
</script>
