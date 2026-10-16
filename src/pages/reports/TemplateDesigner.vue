<template>
  <AppLayout>
    <div v-if="loading" class="flex items-center justify-center py-24" aria-busy="true">
      <div class="w-7 h-7 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="loadError" class="max-w-md mx-auto text-center py-20">
      <span class="material-icons text-4xl text-slate-300">description</span>
      <p class="font-semibold text-slate-700 mt-2">{{ loadError }}</p>
      <RouterLink to="/reports" class="inline-block mt-4 text-sm font-bold text-sky-600">Back to documents</RouterLink>
    </div>

    <div v-else-if="designer" class="space-y-3">

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <RouterLink to="/reports?tab=templates" class="text-slate-400 hover:text-slate-600" aria-label="Back to templates" @click="confirmLeave">
          <span class="material-icons">arrow_back</span></RouterLink>
        <input v-model="name" maxlength="60" aria-label="Template name" placeholder="Template name"
          class="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-sky-400 focus:outline-none px-1 py-0.5 min-w-0 w-48" />
        <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{{ DOC_KINDS[kind].label }}</span>
        <span v-if="unsaved" class="text-xs font-semibold text-amber-600 flex items-center gap-1"><span class="material-icons text-[14px]">edit</span>Unsaved changes</span>
        <span v-else-if="justSaved" class="text-xs font-semibold text-green-600 flex items-center gap-1"><span class="material-icons text-[14px]">check_circle</span>Saved</span>

        <div class="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" class="tb" :disabled="!designer.canUndo.value" title="Undo (Ctrl+Z)" aria-label="Undo" @click="designer.undo()"><span class="material-icons">undo</span></button>
          <button type="button" class="tb" :disabled="!designer.canRedo.value" title="Redo (Ctrl+Y)" aria-label="Redo" @click="designer.redo()"><span class="material-icons">redo</span></button>
          <span class="w-px h-5 bg-gray-200 mx-1"></span>
          <button type="button" class="tb" title="Zoom out" aria-label="Zoom out" @click="zoomBy(-0.5)"><span class="material-icons">remove</span></button>
          <button type="button" class="tb px-2 text-xs font-semibold" title="Fit to width" @click="zoomMode = 'fit'">{{ Math.round((zoom / MM_TO_PX) * 100) }}%</button>
          <button type="button" class="tb" title="Zoom in" aria-label="Zoom in" @click="zoomBy(0.5)"><span class="material-icons">add</span></button>
          <span class="w-px h-5 bg-gray-200 mx-1"></span>
          <label class="flex items-center gap-1 text-xs text-slate-500">Grid
            <select v-model.number="grid" aria-label="Snap grid" class="border border-gray-200 rounded-lg px-1.5 py-1 text-xs bg-white">
              <option :value="0">Off</option><option :value="1">1 mm</option><option :value="2">2 mm</option><option :value="5">5 mm</option>
            </select></label>
          <label class="flex items-center gap-1 text-xs text-slate-500"><input v-model="snapGuides" type="checkbox" class="accent-sky-500" /> Guides</label>
          <span class="w-px h-5 bg-gray-200 mx-1"></span>
          <button type="button" class="tb px-3 gap-1 text-xs font-semibold" @click="showPreview = true"><span class="material-icons">visibility</span>Preview</button>
          <button type="button" @click="save" :disabled="saving || !unsaved"
            class="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
            <span class="material-icons text-[16px]">save</span>{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>

      <p v-if="saveError" role="alert" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ saveError }}</p>
      <p v-if="designer.notice.value" role="status" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{{ designer.notice.value }}</p>
      <p class="lg:hidden text-xs text-slate-500 bg-slate-50 border border-gray-200 rounded-lg px-3 py-2">The designer works best on a tablet or computer.</p>

      <div class="grid lg:grid-cols-[230px_minmax(0,1fr)_290px] gap-3 items-start">

        <!-- Left: add, fields, layers, starting points -->
        <aside class="space-y-4 bg-white border border-gray-200 rounded-xl p-3 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto" aria-label="Add and arrange">
          <section>
            <h3 class="side-title">Add</h3>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="a in ADDABLE" :key="a.type" type="button" class="add-btn" @click="designer.addElement(a.type)">
                <span class="material-icons">{{ a.icon }}</span>{{ a.label }}</button>
            </div>
          </section>

          <section>
            <h3 class="side-title">Fields</h3>
            <p class="text-[11px] text-slate-400 mb-2">Click to put a field at the cursor in the selected text, or in a new text box.</p>
            <div v-for="group in fieldGroups" :key="group.name" class="mb-2.5">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{{ group.name }}</p>
              <div class="flex flex-wrap gap-1">
                <button v-for="f in group.fields" :key="f.key" type="button" :title="f.hint ? `${f.sample} — ${f.hint}` : f.sample"
                  class="text-[11px] px-2 py-1 rounded-md bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-600 transition-colors"
                  @click="insertField(f.key)">{{ f.label }}</button>
              </div>
            </div>
          </section>

          <section>
            <h3 class="side-title">Layers <span class="font-normal normal-case text-slate-400">(front first)</span></h3>
            <ul class="space-y-0.5" aria-label="Layers">
              <li v-for="e in layers" :key="e.id">
                <button type="button" :aria-pressed="e.id === designer.selectedId.value" @click="designer.select(e.id)"
                  :class="['w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors', e.id === designer.selectedId.value ? 'bg-sky-100 text-sky-800' : 'hover:bg-slate-50 text-slate-600']">
                  <span class="material-icons text-[15px] text-slate-400">{{ LAYER_ICONS[e.type] }}</span>
                  <span class="truncate flex-1">{{ elementTitle(e) }}</span>
                  <span v-if="e.locked" class="material-icons text-[13px] text-slate-400">lock</span>
                </button>
              </li>
              <li v-if="layers.length === 0" class="text-xs text-slate-400 px-2 py-2">Empty page. Add something above.</li>
            </ul>
          </section>

          <section>
            <h3 class="side-title">Starting points</h3>
            <div class="space-y-1.5">
              <button v-for="p in PRESET_STYLES" :key="p.key" type="button" class="w-full text-left rounded-lg border border-gray-200 hover:border-sky-300 px-2.5 py-2 transition-colors" @click="applyPreset(p.key)">
                <span class="block text-xs font-semibold text-slate-700">{{ p.label }}</span>
                <span class="block text-[11px] text-slate-400 leading-snug">{{ p.description }}</span>
              </button>
            </div>
          </section>
        </aside>

        <!-- Center: the page -->
        <main ref="scroller" class="bg-slate-200/70 rounded-xl p-4 overflow-auto lg:max-h-[calc(100vh-11rem)] min-h-[24rem]">
          <div class="mx-auto w-fit">
            <DesignerCanvas
              :layout="designer.layout.value" :selected-id="designer.selectedId.value" :zoom="zoom"
              :grid="grid" :show-grid="grid >= 2" :snap-guides="snapGuides"
              :data="sampleData" :logo-url="logoUrl"
              @select="(id: string | null) => designer?.select(id)" @commit-rect="(id: string, rect: Rect) => designer?.setRect(id, rect)" />
          </div>
        </main>

        <!-- Right: properties -->
        <aside class="bg-white border border-gray-200 rounded-xl p-3 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto" aria-label="Properties">
          <ElementProperties ref="properties" :designer="designer" :kind="kind" />
        </aside>
      </div>
    </div>

    <!-- Preview with sample details -->
    <div v-if="showPreview && designer" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Preview" @click.self="showPreview = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 class="font-bold text-slate-800">Preview</h2>
            <p class="text-xs text-slate-400">Shown with sample details, exactly as it will print.</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600" @click="printTest">
              <span class="material-icons text-sm">print</span>Print test page</button>
            <button type="button" aria-label="Close preview" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" @click="showPreview = false">
              <span class="material-icons">close</span></button>
          </div>
        </div>
        <div class="p-5 overflow-y-auto bg-slate-100 rounded-b-2xl">
          <DocumentPreview :layout="designer.layout.value" :data="sampleData" :logo-url="logoUrl" :max-width="640" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { clinicService } from '@/services/clinic.service'
import { documentService } from '@/services/document.service'
import { elementTitle } from '@/utils/documents/elements'
import { nudgeRect, type Rect } from '@/utils/documents/geometry'
import { PLACEHOLDERS, SAMPLE_MEDICINES, placeholdersFor, sampleValues } from '@/utils/documents/placeholders'
import { DEFAULT_ACCENT, PRESET_STYLES, presetLayout, type PresetStyle } from '@/utils/documents/presets'
import { buildPrintHtml } from '@/utils/documents/render'
import { printHtmlDocument } from '@/utils/receipt'
import { DOC_KINDS, type DocData, type DocKind, type ElementType } from '@/utils/documents/types'
import DesignerCanvas from './DesignerCanvas.vue'
import DocumentPreview from './DocumentPreview.vue'
import ElementProperties from './ElementProperties.vue'
import { useDesigner, type Designer } from './useDesigner'

const MM_TO_PX = 96 / 25.4

const route = useRoute()
const auth = useAuthStore()

const loading = ref(true)
const loadError = ref('')
const kind = ref<DocKind>('medcert')
const name = ref('')
const savedName = ref('')
// shallowRef: the designer is an object of refs, which a plain ref would unwrap
const designer = shallowRef<Designer | null>(null)
const logoUrl = ref<string | null>(null)
const accent = ref(DEFAULT_ACCENT)

const saving = ref(false)
const saveError = ref('')
const justSaved = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | undefined

const showPreview = ref(false)
const properties = ref<InstanceType<typeof ElementProperties> | null>(null)

// ── Canvas settings ──
const scroller = ref<HTMLElement | null>(null)
const scrollerWidth = ref(0)
const zoomMode = ref<'fit' | number>('fit')
const grid = ref(1)
const snapGuides = ref(true)

const fitZoom = computed(() => {
  const w = designer.value?.page.value.w ?? 210
  const available = (scrollerWidth.value || 760) - 32
  return Math.min(6, Math.max(1.2, available / w))
})
const zoom = computed(() => (zoomMode.value === 'fit' ? fitZoom.value : zoomMode.value))
const zoomBy = (delta: number) => { zoomMode.value = Math.min(8, Math.max(1, zoom.value + delta)) }

// ── Sample details for the canvas and preview ──
const sampleData = computed<DocData>(() => ({ values: sampleValues(kind.value), medicines: SAMPLE_MEDICINES }))

const ADDABLE = computed<{ type: ElementType; icon: string; label: string }[]>(() => [
  { type: 'text', icon: 'text_fields', label: 'Text' },
  { type: 'image', icon: 'image', label: 'Image' },
  { type: 'line', icon: 'horizontal_rule', label: 'Line' },
  { type: 'box', icon: 'crop_square', label: 'Box' },
  ...(kind.value === 'prescription' ? [{ type: 'medicines' as const, icon: 'medication', label: 'Medicines' }] : []),
])
const LAYER_ICONS: Record<ElementType, string> = { text: 'text_fields', image: 'image', line: 'horizontal_rule', box: 'crop_square', medicines: 'medication' }

const fieldGroups = computed(() => {
  const groups: { name: string; fields: typeof PLACEHOLDERS }[] = []
  for (const f of placeholdersFor(kind.value)) {
    let g = groups.find(x => x.name === f.group)
    if (!g) groups.push((g = { name: f.group, fields: [] }))
    g.fields.push(f)
  }
  return groups
})

const layers = computed(() => [...(designer.value?.layout.value.elements ?? [])].reverse())

function insertField(key: string) {
  const d = designer.value
  if (!d) return
  if (!properties.value?.insertField(key)) d.addTextWith(`{${key}}`)
}

function applyPreset(style: PresetStyle) {
  const d = designer.value
  if (!d) return
  if (d.layout.value.elements.length > 0 && !window.confirm('Replace the current design with this starting point? You can undo it.')) return
  d.replaceLayout(presetLayout(kind.value, style, { accent: accent.value, paper: d.layout.value.paper.size }))
}

// ── Saving ──
const unsaved = computed(() => !!designer.value && (designer.value.dirty.value || name.value.trim() !== savedName.value))

async function save() {
  const d = designer.value
  if (!d || saving.value) return
  if (!name.value.trim()) {
    saveError.value = 'Give the template a name.'
    return
  }
  saving.value = true
  saveError.value = ''
  const { error } = await documentService.updateTemplate(String(route.params.id), { name: name.value.trim(), layout: d.layout.value })
  saving.value = false
  if (error) {
    saveError.value = error
    return
  }
  d.markSaved()
  savedName.value = name.value.trim()
  justSaved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { justSaved.value = false }, 3000)
}

function printTest() {
  if (!designer.value) return
  printHtmlDocument(buildPrintHtml(designer.value.layout.value, sampleData.value, { clinicLogoUrl: logoUrl.value, title: 'Test print' }))
}

// ── Keyboard ──
function onKeydown(e: KeyboardEvent) {
  const d = designer.value
  const target = e.target as HTMLElement | null
  if (!d || showPreview.value) return
  if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return

  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? d.redo() : d.undo(); return }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); d.redo(); return }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); d.duplicateSelected(); return }
  if (e.key === 'Escape') { d.select(null); return }

  const el = d.selected.value
  if (!el) return
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); d.removeSelected(); return }
  if (e.key.startsWith('Arrow') && !el.locked) {
    e.preventDefault()
    const next = nudgeRect({ x: el.x, y: el.y, w: el.w, h: el.h }, e.key as 'ArrowLeft', e.shiftKey, d.page.value)
    d.setRect(el.id, next, `nudge:${el.id}`)
  }
}

// ── Leaving with unsaved work ──
function confirmLeave(e: Event) {
  if (unsaved.value && !window.confirm('You have unsaved changes. Leave without saving?')) e.preventDefault()
}
onBeforeRouteLeave(() => !unsaved.value || window.confirm('You have unsaved changes. Leave without saving?'))
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (unsaved.value) { e.preventDefault(); e.returnValue = '' }
}

let observer: ResizeObserver | null = null
watch(scroller, el => {
  observer?.disconnect()
  if (el && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => { scrollerWidth.value = el.clientWidth })
    observer.observe(el)
  }
  scrollerWidth.value = el?.clientWidth ?? 0
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)

  const clinicId = auth.clinic?.id
  const { data, error } = await documentService.getTemplate(String(route.params.id))
  if (error || !data || (clinicId && data.clinic_id !== clinicId)) {
    loadError.value = 'This template could not be found.'
    loading.value = false
    return
  }
  kind.value = data.kind
  name.value = savedName.value = data.name
  designer.value = useDesigner(data.layout)
  loading.value = false

  if (clinicId) {
    const { data: branding } = await clinicService.getClinicBranding(clinicId)
    logoUrl.value = branding?.logo_url ?? null
    accent.value = branding?.primary_color ?? DEFAULT_ACCENT
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  observer?.disconnect()
  clearTimeout(savedTimer)
})
</script>

<style scoped>
.tb { display: inline-flex; align-items: center; justify-content: center; height: 2rem; min-width: 2rem; border: 1px solid #e2e8f0; border-radius: 0.55rem; background: #fff; color: #475569; }
.tb:hover:not(:disabled) { background: #f1f5f9; }
.tb:disabled { opacity: 0.35; }
.tb .material-icons { font-size: 18px; }
.side-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 0.5rem; }
.add-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; font-size: 0.75rem; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; border-radius: 0.6rem; background: #fff; }
.add-btn:hover { border-color: #7dd3fc; background: #f0f9ff; color: #0369a1; }
.add-btn .material-icons { font-size: 17px; }
</style>
