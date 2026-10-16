<template>
  <div class="space-y-5 text-sm">

    <!-- Nothing selected: the page -->
    <template v-if="!el">
      <section>
        <h3 class="panel-title">Page</h3>
        <label class="field-label" for="paper-size">Paper size</label>
        <select id="paper-size" :value="layout.paper.size" @change="designer.setPaper({ size: val($event) as PaperSize })" class="input">
          <option v-for="(p, key) in PAPER_SIZES" :key="key" :value="key">{{ p.label }}</option>
        </select>
        <div class="grid grid-cols-2 gap-2 mt-3" role="group" aria-label="Orientation">
          <button v-for="o in ['portrait', 'landscape']" :key="o" type="button" @click="designer.setPaper({ orientation: o as any })"
            :aria-pressed="layout.paper.orientation === o"
            :class="['seg', layout.paper.orientation === o && 'seg-on']">{{ o === 'portrait' ? 'Portrait' : 'Landscape' }}</button>
        </div>
        <label class="field-label mt-3" for="margin">Safe margin guide (mm)</label>
        <input id="margin" type="number" min="0" max="40" step="1" :value="layout.paper.margin" @input="designer.setPaper({ margin: num($event) })" class="input" />
        <p class="hint">Most printers can't print right to the edge. Keep important text inside the dashed line.</p>
      </section>
      <section class="rounded-xl bg-slate-50 border border-gray-200 p-3 text-xs text-slate-500 space-y-1.5">
        <p class="font-bold text-slate-600">Tips</p>
        <p>Click an element to select it. Drag to move, drag the squares to resize.</p>
        <p>Arrow keys nudge by 1 mm (hold Shift for 5 mm). Hold Alt while dragging to move freely.</p>
        <p>Type <code class="font-mono bg-white px-1 rounded">{patient_name}</code> in any text, or pick fields from the left.</p>
        <p>Leaving the top blank? Print on paper that already has your letterhead.</p>
      </section>
    </template>

    <template v-else>
      <!-- Header and actions -->
      <section>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{{ ELEMENT_LABELS[el.type] }}</span>
          <span class="font-semibold text-slate-700 truncate">{{ elementTitle(el) }}</span>
        </div>
        <div class="flex gap-1.5">
          <button type="button" class="icon-btn" title="Duplicate (Ctrl+D)" aria-label="Duplicate" @click="designer.duplicateSelected()"><span class="material-icons">content_copy</span></button>
          <button type="button" class="icon-btn" :title="el.locked ? 'Unlock' : 'Lock in place'" :aria-label="el.locked ? 'Unlock' : 'Lock'" :aria-pressed="!!el.locked" @click="designer.toggleLock(el.id)">
            <span class="material-icons">{{ el.locked ? 'lock' : 'lock_open' }}</span></button>
          <button type="button" class="icon-btn text-red-500" title="Delete (Del)" aria-label="Delete" @click="designer.removeSelected()"><span class="material-icons">delete</span></button>
        </div>
        <label class="field-label mt-3" for="el-name">Label (for the layers list)</label>
        <input id="el-name" type="text" maxlength="60" :value="el.name ?? ''" @input="patch({ name: val($event) })" class="input" placeholder="Optional" />
      </section>

      <!-- Position -->
      <section>
        <h3 class="panel-title">Position &amp; size <span class="font-normal text-slate-400">(mm)</span></h3>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="f in RECT_FIELDS" :key="f.key" class="block">
            <span class="field-label">{{ f.label }}</span>
            <input type="number" step="0.5" :min="f.min" :value="round(el[f.key])" :disabled="el.locked" :aria-label="f.label"
              @input="setRect({ [f.key]: num($event) })" class="input" />
          </label>
        </div>
        <div class="grid grid-cols-6 gap-1 mt-3" role="group" aria-label="Align to page">
          <button v-for="a in ALIGNS" :key="a.how" type="button" class="icon-btn" :title="a.title" :aria-label="a.title" :disabled="el.locked" @click="designer.alignSelected(a.how)">
            <span class="material-icons">{{ a.icon }}</span></button>
        </div>
        <div class="grid grid-cols-4 gap-1 mt-1.5" role="group" aria-label="Layer order">
          <button type="button" class="seg" @click="designer.toBack(el.id)" title="Send to back">Back</button>
          <button type="button" class="seg" @click="designer.reorder(el.id, -1)" title="Send backward">↓</button>
          <button type="button" class="seg" @click="designer.reorder(el.id, 1)" title="Bring forward">↑</button>
          <button type="button" class="seg" @click="designer.toFront(el.id)" title="Bring to front">Front</button>
        </div>
      </section>

      <!-- Text -->
      <template v-if="el.type === 'text'">
        <section>
          <h3 class="panel-title">Text</h3>
          <label class="field-label" for="el-content">Content</label>
          <textarea id="el-content" ref="contentBox" rows="5" maxlength="5000" :value="el.content" @input="patch({ content: val($event) }, `text:${el.id}`)" class="input font-mono text-xs"></textarea>
          <p v-if="unknown.length" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
            Not a known field: <span v-for="k in unknown" :key="k" class="font-mono">{{ '{' + k + '}' }} </span>
          </p>
          <p v-else class="hint">Use the fields on the left. A line made only of empty fields is left out when the document is printed.</p>
        </section>
        <section>
          <h3 class="panel-title">Style</h3>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="field-label">Font</span>
              <select :value="el.font" @change="patch({ font: val($event) as any })" class="input">
                <option v-for="(f, key) in FONTS" :key="key" :value="key">{{ f.label }}</option></select></label>
            <label class="block"><span class="field-label">Size (pt)</span>
              <input type="number" min="5" max="72" step="0.5" :value="el.size" @input="patch({ size: num($event) })" class="input" /></label>
          </div>
          <div class="grid grid-cols-3 gap-1.5 mt-2" role="group" aria-label="Emphasis">
            <button type="button" :aria-pressed="el.bold" :class="['seg font-bold', el.bold && 'seg-on']" @click="patch({ bold: !el.bold })">B</button>
            <button type="button" :aria-pressed="el.italic" :class="['seg italic', el.italic && 'seg-on']" @click="patch({ italic: !el.italic })">I</button>
            <button type="button" :aria-pressed="el.underline" :class="['seg underline', el.underline && 'seg-on']" @click="patch({ underline: !el.underline })">U</button>
          </div>
          <div class="grid grid-cols-4 gap-1.5 mt-2" role="group" aria-label="Alignment">
            <button v-for="a in TEXT_ALIGNS" :key="a.key" type="button" :aria-pressed="el.align === a.key" :aria-label="a.label"
              :class="['icon-btn', el.align === a.key && 'seg-on']" @click="patch({ align: a.key })"><span class="material-icons">{{ a.icon }}</span></button>
          </div>
          <div class="grid grid-cols-3 gap-1.5 mt-2" role="group" aria-label="Vertical alignment">
            <button v-for="v in VALIGNS" :key="v.key" type="button" :aria-pressed="el.valign === v.key" :class="['seg', el.valign === v.key && 'seg-on']" @click="patch({ valign: v.key })">{{ v.label }}</button>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <label class="block"><span class="field-label">Text color</span>
              <input type="color" :value="el.color" @input="patch({ color: val($event) })" class="color" /></label>
            <label class="block"><span class="field-label">Line height</span>
              <input type="number" min="0.8" max="3" step="0.1" :value="el.lineHeight" @input="patch({ lineHeight: num($event) })" class="input" /></label>
          </div>
          <label class="block mt-2"><span class="field-label">Padding (mm)</span>
            <input type="number" min="0" max="30" step="0.5" :value="el.padding" @input="patch({ padding: num($event) })" class="input" /></label>
        </section>
        <section>
          <h3 class="panel-title">Box</h3>
          <FillControl :fill="el.fill" @change="v => patch({ fill: v })" />
          <BorderControl :border="el.border" @change="b => patch({ border: b })" />
        </section>
      </template>

      <!-- Image -->
      <template v-else-if="el.type === 'image'">
        <section>
          <h3 class="panel-title">Image</h3>
          <div class="grid grid-cols-2 gap-1.5" role="group" aria-label="Image source">
            <button type="button" :aria-pressed="el.source.kind === 'clinic_logo'" :class="['seg', el.source.kind === 'clinic_logo' && 'seg-on']" @click="patch({ source: { kind: 'clinic_logo' } })">Clinic logo</button>
            <button type="button" :aria-pressed="el.source.kind === 'url'" :class="['seg', el.source.kind === 'url' && 'seg-on']" @click="fileInput?.click()">Upload image</button>
          </div>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onFile" />
          <p v-if="el.source.kind === 'clinic_logo'" class="hint">Uses the logo from Branding &amp; Themes. Upload your own instead for a signature or stamp.</p>
          <div v-else class="mt-2 flex items-center gap-3">
            <img :src="el.source.url" alt="" class="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-slate-50" />
            <button type="button" class="text-xs font-semibold text-sky-600" @click="fileInput?.click()">Replace…</button>
          </div>
          <p v-if="uploading" class="hint">Uploading…</p>
          <p v-if="uploadError" role="alert" class="text-xs text-red-600 mt-1">{{ uploadError }}</p>
          <div class="grid grid-cols-2 gap-2 mt-3">
            <label class="block"><span class="field-label">Fit</span>
              <select :value="el.fit" @change="patch({ fit: val($event) as any })" class="input">
                <option value="contain">Fit inside</option><option value="cover">Fill and crop</option><option value="fill">Stretch</option></select></label>
            <label class="block"><span class="field-label">Corner radius (mm)</span>
              <input type="number" min="0" max="50" step="0.5" :value="el.radius" @input="patch({ radius: num($event) })" class="input" /></label>
          </div>
          <label class="block mt-2"><span class="field-label">Opacity ({{ Math.round(el.opacity * 100) }}%)</span>
            <input type="range" min="0.05" max="1" step="0.05" :value="el.opacity" @input="patch({ opacity: num($event) })" class="w-full" /></label>
        </section>
      </template>

      <!-- Line -->
      <template v-else-if="el.type === 'line'">
        <section>
          <h3 class="panel-title">Line</h3>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="field-label">Thickness (mm)</span>
              <input type="number" min="0.1" max="5" step="0.1" :value="el.thickness" @input="patch({ thickness: num($event) })" class="input" /></label>
            <label class="block"><span class="field-label">Color</span>
              <input type="color" :value="el.color" @input="patch({ color: val($event) })" class="color" /></label>
          </div>
          <label class="block mt-2"><span class="field-label">Style</span>
            <select :value="el.dash" @change="patch({ dash: val($event) as any })" class="input">
              <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
        </section>
      </template>

      <!-- Box -->
      <template v-else-if="el.type === 'box'">
        <section>
          <h3 class="panel-title">Box</h3>
          <FillControl :fill="el.fill" @change="v => patch({ fill: v })" />
          <BorderControl :border="el.border" @change="b => patch({ border: b })" />
        </section>
      </template>

      <!-- Medicines -->
      <template v-else-if="el.type === 'medicines'">
        <section>
          <h3 class="panel-title">Medicines list</h3>
          <p class="hint mb-2">Filled in from the medicines typed when the prescription is issued.</p>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="field-label">Font</span>
              <select :value="el.font" @change="patch({ font: val($event) as any })" class="input">
                <option v-for="(f, key) in FONTS" :key="key" :value="key">{{ f.label }}</option></select></label>
            <label class="block"><span class="field-label">Size (pt)</span>
              <input type="number" min="5" max="40" step="0.5" :value="el.size" @input="patch({ size: num($event) })" class="input" /></label>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <label class="block"><span class="field-label">Color</span>
              <input type="color" :value="el.color" @input="patch({ color: val($event) })" class="color" /></label>
            <label class="block"><span class="field-label">Line height</span>
              <input type="number" min="0.8" max="3" step="0.1" :value="el.lineHeight" @input="patch({ lineHeight: num($event) })" class="input" /></label>
          </div>
          <label v-for="t in MED_TOGGLES" :key="t.key" class="flex items-center gap-2 mt-2 text-slate-600">
            <input type="checkbox" :checked="el[t.key]" @change="patch({ [t.key]: ($event.target as HTMLInputElement).checked })" class="accent-sky-500" /> {{ t.label }}
          </label>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { documentService } from '@/services/document.service'
import { ELEMENT_LABELS, elementTitle } from '@/utils/documents/elements'
import { unknownPlaceholders } from '@/utils/documents/placeholders'
import { FONTS, PAPER_SIZES, type DocElement, type DocKind, type PaperSize } from '@/utils/documents/types'
import type { AlignTo, Rect } from '@/utils/documents/geometry'
import type { Designer } from './useDesigner'
import FillControl from './FillControl.vue'
import BorderControl from './BorderControl.vue'

const props = defineProps<{ designer: Designer; kind: DocKind }>()

const auth = useAuthStore()
const layout = computed(() => props.designer.layout.value)
const el = computed<DocElement | null>(() => props.designer.selected.value)

const val = (e: Event) => (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
const num = (e: Event) => Number((e.target as HTMLInputElement).value)
const round = (v: number) => Math.round(v * 100) / 100

const RECT_FIELDS: { key: keyof Rect; label: string; min: number }[] = [
  { key: 'x', label: 'X', min: -100 }, { key: 'y', label: 'Y', min: -100 },
  { key: 'w', label: 'Width', min: 0 }, { key: 'h', label: 'Height', min: 0 },
]
const ALIGNS: { how: AlignTo; icon: string; title: string }[] = [
  { how: 'left', icon: 'align_horizontal_left', title: 'Align left' },
  { how: 'center', icon: 'align_horizontal_center', title: 'Center horizontally' },
  { how: 'right', icon: 'align_horizontal_right', title: 'Align right' },
  { how: 'top', icon: 'align_vertical_top', title: 'Align top' },
  { how: 'middle', icon: 'align_vertical_center', title: 'Center vertically' },
  { how: 'bottom', icon: 'align_vertical_bottom', title: 'Align bottom' },
]
const TEXT_ALIGNS = [
  { key: 'left', icon: 'format_align_left', label: 'Align text left' },
  { key: 'center', icon: 'format_align_center', label: 'Center text' },
  { key: 'right', icon: 'format_align_right', label: 'Align text right' },
  { key: 'justify', icon: 'format_align_justify', label: 'Justify text' },
] as const
const VALIGNS = [{ key: 'top', label: 'Top' }, { key: 'middle', label: 'Middle' }, { key: 'bottom', label: 'Bottom' }] as const
const MED_TOGGLES = [
  { key: 'showSymbol', label: 'Show the ℞ symbol' },
  { key: 'showNumber', label: 'Number the medicines' },
  { key: 'showQty', label: 'Show quantity' },
] as const

function patch(p: Record<string, unknown>, mergeKey?: string) {
  if (el.value) props.designer.patchElement(el.value.id, p as Partial<DocElement>, mergeKey)
}

function setRect(p: Partial<Rect>) {
  const e = el.value
  if (!e) return
  props.designer.setRect(e.id, { x: e.x, y: e.y, w: e.w, h: e.h, ...p }, `rect-input:${e.id}`)
}

const unknown = computed(() => (el.value?.type === 'text' ? unknownPlaceholders(el.value.content, props.kind) : []))

// ── Inserting a field at the cursor ──
const contentBox = ref<HTMLTextAreaElement | null>(null)

/** Puts {key} where the cursor is in the selected text. Returns false if no text is being edited. */
function insertField(key: string): boolean {
  const e = el.value
  if (!e || e.type !== 'text') return false
  const box = contentBox.value
  const token = `{${key}}`
  const start = box?.selectionStart ?? e.content.length
  const end = box?.selectionEnd ?? start
  const content = e.content.slice(0, start) + token + e.content.slice(end)
  props.designer.patchElement(e.id, { content } as Partial<DocElement>, `text:${e.id}`)
  return true
}
defineExpose({ insertField })

// ── Image upload ──
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const current = el.value
  if (!file || !current || current.type !== 'image' || !auth.clinic?.id) return
  uploading.value = true
  uploadError.value = ''
  const { data, error } = await documentService.uploadImage(auth.clinic.id, file)
  uploading.value = false
  if (error || !data) {
    uploadError.value = error ?? 'Upload failed'
    return
  }
  props.designer.patchElement(current.id, { source: { kind: 'url', url: data } } as Partial<DocElement>)
}
</script>

<style scoped>
.panel-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 0.5rem; }
.field-label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 0.25rem; }
.hint { font-size: 11px; color: #94a3b8; margin-top: 0.35rem; line-height: 1.4; }
.input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.6rem; padding: 0.45rem 0.6rem; font-size: 0.8rem; background: #f8fafc; color: #0f172a; }
.input:focus { outline: 2px solid #38bdf8; background: #fff; }
.input:disabled { opacity: 0.5; }
.color { width: 100%; height: 2.1rem; border: 1px solid #e2e8f0; border-radius: 0.6rem; padding: 2px; background: #fff; cursor: pointer; }
.seg { border: 1px solid #e2e8f0; border-radius: 0.55rem; padding: 0.4rem 0.3rem; font-size: 0.75rem; font-weight: 600; color: #475569; background: #fff; }
.seg:hover { background: #f1f5f9; }
.seg-on { background: #e0f2fe; border-color: #38bdf8; color: #0369a1; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; height: 2rem; min-width: 2rem; border: 1px solid #e2e8f0; border-radius: 0.55rem; background: #fff; color: #475569; }
.icon-btn:hover:not(:disabled) { background: #f1f5f9; }
.icon-btn:disabled { opacity: 0.4; }
.icon-btn .material-icons { font-size: 18px; }
</style>
