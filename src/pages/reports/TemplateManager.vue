<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-base font-bold text-slate-800">Document templates</h2>
        <p class="text-xs text-slate-400 mt-0.5 max-w-xl">
          Design how your medical certificates and prescriptions look: your logo, letterhead, paper size and wording.
          The template marked <span class="font-semibold text-slate-500">Default</span> is used when nobody picks another.
        </p>
      </div>
      <button v-if="auth.isAdmin" type="button" @click="openNew"
        class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
        <span class="material-icons text-[18px]">add</span>New template</button>
    </div>

    <p v-if="!auth.isAdmin" class="text-xs text-slate-500 bg-slate-50 border border-gray-200 rounded-lg px-3 py-2">
      Only the clinic admin can design or change templates. You can pick any of them when issuing a document.
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ error }}</p>

    <div v-if="loading" class="py-12 flex justify-center" aria-busy="true">
      <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="templates.length === 0" class="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
      <span class="material-icons text-4xl text-slate-300">design_services</span>
      <p class="font-semibold text-slate-700 mt-2">No custom templates yet</p>
      <p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
        Documents use the built-in Classic design until you make your own. Add your logo and letterhead to get started.
      </p>
      <button v-if="auth.isAdmin" type="button" @click="openNew"
        class="mt-4 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">Create your first template</button>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.kind">
        <h3 class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{{ DOC_KINDS[group.kind].label }}</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <article v-for="t in group.items" :key="t.id" class="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            <div class="bg-slate-100 p-3 flex justify-center">
              <div class="w-40"><DocumentPreview :layout="t.layout" :data="sampleFor(t.kind)" :logo-url="logoUrl" :max-width="160" /></div>
            </div>
            <div class="p-3 flex-1 flex flex-col">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-800 text-sm truncate">{{ t.name }}</h4>
                <span v-if="t.is_default" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Default</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">{{ PAPER_SIZES[t.layout.paper.size].label.split(' (')[0] }}
                · {{ t.layout.elements.length }} element{{ t.layout.elements.length === 1 ? '' : 's' }}</p>
              <div v-if="auth.isAdmin" class="mt-3 flex flex-wrap gap-1.5">
                <RouterLink :to="`/reports/design/${t.id}`" class="act act-primary">Edit design</RouterLink>
                <button v-if="!t.is_default" type="button" class="act" :disabled="busyId === t.id" @click="makeDefault(t)">Make default</button>
                <button type="button" class="act" :disabled="busyId === t.id" @click="duplicate(t)">Duplicate</button>
                <button type="button" class="act text-red-500" :disabled="busyId === t.id" @click="remove(t)">Delete</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- New template -->
    <div v-if="showNew" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="new-title" @click.self="showNew = false">
      <form class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-5" @submit.prevent="create">
        <div class="flex items-start justify-between">
          <div>
            <h2 id="new-title" class="text-lg font-black text-slate-900">New template</h2>
            <p class="text-xs text-slate-400">Start from a ready-made design, then change anything.</p>
          </div>
          <button type="button" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center" aria-label="Close" @click="showNew = false">
            <span class="material-icons">close</span></button>
        </div>

        <div>
          <p class="label">For</p>
          <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Document type">
            <button v-for="(k, key) in DOC_KINDS" :key="key" type="button" role="radio" :aria-checked="newKind === key" @click="chooseKind(key)"
              :class="['rounded-xl border-2 px-3 py-2.5 text-left transition-colors', newKind === key ? 'border-sky-400 bg-sky-50' : 'border-gray-100 hover:border-sky-200']">
              <span class="material-icons text-[20px] text-sky-500">{{ k.icon }}</span>
              <span class="block text-sm font-bold text-slate-800 mt-0.5">{{ k.label }}</span></button>
          </div>
        </div>

        <div>
          <p class="label">Starting point</p>
          <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Starting point">
            <button v-for="p in PRESET_STYLES" :key="p.key" type="button" role="radio" :aria-checked="newStyle === p.key" @click="newStyle = p.key"
              :class="['rounded-xl border-2 p-2 text-left transition-colors', newStyle === p.key ? 'border-sky-400 bg-sky-50' : 'border-gray-100 hover:border-sky-200']">
              <div class="bg-slate-100 rounded-md p-1.5 mb-1.5"><DocumentPreview :layout="presetFor(p.key)" :data="sampleFor(newKind)" :logo-url="logoUrl" :max-width="90" /></div>
              <span class="block text-xs font-bold text-slate-700 leading-tight">{{ p.label.split(' (')[0] }}</span></button>
          </div>
          <p class="text-[11px] text-slate-400 mt-1.5">{{ PRESET_STYLES.find(p => p.key === newStyle)?.description }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="label">Name</span>
            <input v-model="newName" maxlength="60" required placeholder="e.g. Clinic letterhead" class="input" /></label>
          <label class="block"><span class="label">Paper</span>
            <select v-model="newPaper" class="input"><option v-for="(p, key) in PAPER_SIZES" :key="key" :value="key">{{ p.label }}</option></select></label>
        </div>

        <p v-if="createError" role="alert" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ createError }}</p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm" @click="showNew = false">Cancel</button>
          <button type="submit" :disabled="creating || !newName.trim()"
            class="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-sm">
            {{ creating ? 'Creating…' : 'Create and design' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import { documentService, type DocumentTemplate } from '@/services/document.service'
import { SAMPLE_MEDICINES, sampleValues } from '@/utils/documents/placeholders'
import { DEFAULT_ACCENT, PRESET_STYLES, presetLayout, type PresetStyle } from '@/utils/documents/presets'
import { DOC_KINDS, PAPER_SIZES, type DocData, type DocKind, type PaperSize } from '@/utils/documents/types'
import DocumentPreview from './DocumentPreview.vue'

const auth = useAuthStore()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const templates = ref<DocumentTemplate[]>([])
const logoUrl = ref<string | null>(null)
const accent = ref(DEFAULT_ACCENT)
const busyId = ref<string | null>(null)

const sampleFor = (kind: DocKind): DocData => ({ values: sampleValues(kind), medicines: SAMPLE_MEDICINES })

const groups = computed(() =>
  (Object.keys(DOC_KINDS) as DocKind[])
    .map(kind => ({ kind, items: templates.value.filter(t => t.kind === kind) }))
    .filter(g => g.items.length > 0))

async function load() {
  const clinicId = auth.clinic?.id
  if (!clinicId) return
  loading.value = true
  const [list, branding] = await Promise.all([documentService.listTemplates(clinicId), clinicService.getClinicBranding(clinicId)])
  loading.value = false
  if (list.error) error.value = list.error
  templates.value = list.data ?? []
  logoUrl.value = branding.data?.logo_url ?? null
  accent.value = branding.data?.primary_color ?? DEFAULT_ACCENT
}

// ── New template ──
const showNew = ref(false)
const newKind = ref<DocKind>('medcert')
const newStyle = ref<PresetStyle>('classic')
const newName = ref('')
const newPaper = ref<PaperSize>('a4')
const creating = ref(false)
const createError = ref('')

const presetFor = (style: PresetStyle) => presetLayout(newKind.value, style, { accent: accent.value, paper: newPaper.value })

function chooseKind(kind: DocKind) {
  newKind.value = kind
  newPaper.value = kind === 'prescription' ? 'a5' : 'a4'
}

function openNew() {
  newKind.value = 'medcert'
  newStyle.value = 'classic'
  newPaper.value = 'a4'
  newName.value = ''
  createError.value = ''
  showNew.value = true
}

async function create() {
  const clinicId = auth.clinic?.id
  if (!clinicId || !newName.value.trim() || creating.value) return
  creating.value = true
  createError.value = ''
  const { data, error: err } = await documentService.createTemplate({
    clinic_id: clinicId,
    kind: newKind.value,
    name: newName.value,
    layout: presetFor(newStyle.value),
    // The first template of a kind becomes its default
    is_default: !templates.value.some(t => t.kind === newKind.value),
  })
  creating.value = false
  if (err || !data) {
    createError.value = err ?? 'Could not create the template.'
    return
  }
  router.push(`/reports/design/${data.id}`)
}

// ── Actions ──
async function makeDefault(t: DocumentTemplate) {
  busyId.value = t.id
  const { error: err } = await documentService.updateTemplate(t.id, { is_default: true })
  busyId.value = null
  if (err) { error.value = err; return }
  await load()
}

async function duplicate(t: DocumentTemplate) {
  const clinicId = auth.clinic?.id
  if (!clinicId) return
  busyId.value = t.id
  const { error: err } = await documentService.createTemplate({
    clinic_id: clinicId, kind: t.kind, name: `${t.name} (copy)`.slice(0, 60), layout: t.layout,
  })
  busyId.value = null
  if (err) { error.value = err; return }
  await load()
}

async function remove(t: DocumentTemplate) {
  if (!window.confirm(`Delete “${t.name}”? Documents already issued with it keep their layout.`)) return
  busyId.value = t.id
  const { error: err } = await documentService.deleteTemplate(t.id)
  busyId.value = null
  if (err) { error.value = err; return }
  await load()
}

onMounted(load)
</script>

<style scoped>
.label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.4rem; }
.input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.55rem 0.7rem; font-size: 0.85rem; background: #f8fafc; }
.input:focus { outline: 2px solid #38bdf8; background: #fff; }
.act { font-size: 0.72rem; font-weight: 700; padding: 0.35rem 0.65rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #fff; color: #475569; }
.act:hover:not(:disabled) { background: #f1f5f9; }
.act:disabled { opacity: 0.5; }
.act-primary { background: #0ea5e9; border-color: #0ea5e9; color: #fff; }
.act-primary:hover { background: #0284c7 !important; }
</style>
