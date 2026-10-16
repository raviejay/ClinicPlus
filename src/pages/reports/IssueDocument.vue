<template>
  <div class="grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-6 items-start">

    <!-- Form -->
    <div class="space-y-4">
      <!-- Type -->
      <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Document type">
        <button v-for="(k, key) in DOC_KINDS" :key="key" type="button" role="radio" :aria-checked="kind === key" @click="setKind(key)"
          :class="['flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all', kind === key ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-gray-100 bg-white hover:border-sky-200']">
          <span :class="['material-icons text-2xl', key === 'medcert' ? 'text-sky-500' : 'text-purple-500']">{{ k.icon }}</span>
          <span><span class="block font-bold text-slate-800 text-sm">{{ k.label }}</span>
            <span class="block text-[11px] text-slate-400 leading-snug mt-0.5">{{ k.description }}</span></span>
        </button>
      </div>

      <div v-if="issued" class="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3" role="status">
        <div class="flex items-center gap-2 text-green-700">
          <span class="material-icons">check_circle</span>
          <p class="font-bold">{{ issued.number }} issued</p>
        </div>
        <p class="text-xs text-green-700/80">Saved to History. You can reprint it any time exactly as it was issued.</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700" @click="printDoc(issued)">Print again</button>
          <button type="button" class="px-4 py-2 rounded-xl bg-white border border-green-200 text-green-700 text-sm font-bold hover:bg-green-100" @click="startAnother">Issue another</button>
          <button type="button" class="px-4 py-2 rounded-xl text-sm font-semibold text-green-700 hover:bg-green-100" @click="$emit('show-history')">View history</button>
        </div>
      </div>

      <div v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span class="material-icons text-sky-500 text-base">edit_note</span>Details</h2>

        <label class="block">
          <span class="lbl">Design</span>
          <select v-model="templateId" aria-label="Template" class="inp">
            <optgroup v-if="savedForKind.length" label="Your templates">
              <option v-for="o in options.filter(x => x.savedId)" :key="o.id" :value="o.id">{{ o.label }}</option></optgroup>
            <optgroup label="Built-in">
              <option v-for="o in options.filter(x => !x.savedId)" :key="o.id" :value="o.id">{{ o.label }}</option></optgroup>
          </select>
        </label>

        <PatientLookup v-model="patient" label="Patient" required />

        <label class="block">
          <span class="lbl">Attending doctor <span class="text-red-400">*</span></span>
          <select v-model="doctorId" id="doctor" class="inp">
            <option value="">Select doctor…</option>
            <option v-for="d in doctors" :key="d.id" :value="d.id">{{ d.full_name }}</option>
          </select>
        </label>

        <label class="block"><span class="lbl">Date</span>
          <input v-model="date" id="date" type="date" class="inp" /></label>

        <!-- Certificate -->
        <template v-if="kind === 'medcert'">
          <label class="block"><span class="lbl">Purpose</span>
            <select v-model="cert.purpose" id="purpose" class="inp">
              <option value="">Select purpose…</option>
              <option v-for="(label, key) in PURPOSES" :key="key" :value="key">{{ label }}</option></select></label>
          <label class="block"><span class="lbl">Diagnosis / findings</span>
            <textarea v-model="cert.diagnosis" id="diagnosis" rows="3" maxlength="1500" placeholder="e.g. Patient was examined and found to be in good health…" class="inp resize-none"></textarea></label>
          <label class="block"><span class="lbl">Recommendation / remarks</span>
            <textarea v-model="cert.remarks" id="remarks" rows="2" maxlength="1000" placeholder="e.g. Fit to work, no restrictions…" class="inp resize-none"></textarea></label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block"><span class="lbl">Days of rest <span class="normal-case font-normal text-slate-300">(optional)</span></span>
              <input v-model="cert.restDays" id="rest-days" type="number" min="0" max="365" class="inp" /></label>
            <label class="block"><span class="lbl">Valid until <span class="normal-case font-normal text-slate-300">(optional)</span></span>
              <input v-model="cert.validUntil" id="valid-until" type="date" class="inp" /></label>
          </div>
        </template>

        <!-- Prescription -->
        <template v-else>
          <label class="block"><span class="lbl">Diagnosis</span>
            <input v-model="rx.diagnosis" id="rx-diagnosis" type="text" maxlength="300" placeholder="e.g. Upper respiratory tract infection" class="inp" /></label>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="lbl !mb-0">Medicines (Rx)</span>
              <button type="button" class="flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-600" @click="addMedicine">
                <span class="material-icons text-sm">add_circle</span>Add medicine</button>
            </div>
            <div v-for="(med, i) in medicines" :key="i" class="flex gap-2 mb-3 items-start">
              <div class="flex-1 space-y-1.5">
                <input v-model="med.name" type="text" maxlength="200" :aria-label="`Medicine ${i + 1} name`" placeholder="Drug name & strength (e.g. Amoxicillin 500mg)" class="inp" />
                <input v-model="med.sig" type="text" maxlength="300" :aria-label="`Medicine ${i + 1} sig`" placeholder="Sig: e.g. 1 cap TID x 7 days" class="inp" />
                <input v-model="med.qty" type="text" maxlength="30" :aria-label="`Medicine ${i + 1} quantity`" placeholder="Quantity (e.g. #21)" class="inp" />
              </div>
              <button type="button" class="mt-2 text-slate-300 hover:text-red-400" :aria-label="`Remove medicine ${i + 1}`" @click="removeMedicine(i)">
                <span class="material-icons text-lg">remove_circle_outline</span></button>
            </div>
          </div>

          <label class="block"><span class="lbl">Notes / instructions</span>
            <textarea v-model="rx.remarks" id="rx-remarks" rows="2" maxlength="1000" placeholder="e.g. Avoid alcohol. Complete the full course." class="inp resize-none"></textarea></label>
          <label class="block"><span class="lbl">Follow-up date <span class="normal-case font-normal text-slate-300">(optional)</span></span>
            <input v-model="rx.followUp" id="follow-up" type="date" class="inp" /></label>
        </template>

        <!-- Doesn't fit -->
        <div v-if="overflowNames.length" role="alert" class="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-xs text-amber-800 space-y-2">
          <p class="font-bold flex items-center gap-1"><span class="material-icons text-[16px]">warning</span>Some text doesn't fit this design</p>
          <p>{{ overflowNames.join(', ') }} runs past its box and may overlap what's below. Shorten it, or pick a different design.</p>
          <label class="flex items-center gap-2 font-semibold"><input v-model="overflowOk" type="checkbox" class="accent-amber-500" /> Issue it anyway</label>
        </div>

        <p v-if="errorMsg" role="alert" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{{ errorMsg }}</p>

        <div class="flex gap-3 pt-1">
          <button type="button" @click="issue" :disabled="!canIssue || issuing"
            class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-icons text-sm">print</span>{{ issuing ? 'Issuing…' : 'Issue & print' }}</button>
          <button type="button" class="px-4 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm font-semibold hover:bg-slate-50" @click="reset">Reset</button>
        </div>
        <p class="text-[11px] text-slate-400 -mt-1">Issuing saves a numbered copy to History, then opens the print dialog.</p>
      </div>
    </div>

    <!-- Live preview -->
    <div class="lg:sticky lg:top-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-bold text-slate-700">Preview</h2>
        <span class="text-[11px] text-slate-400">{{ PAPER_SIZES[layout.paper.size].label.split(' (')[0] }} · updates as you type</span>
      </div>
      <div class="bg-slate-200/70 rounded-2xl p-4 flex justify-center">
        <DocumentPreview :layout="layout" :data="previewData" :logo-url="logoUrl" :max-width="560" @overflow="overflowIds = $event" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { clinicService } from '@/services/clinic.service'
import { documentService, type DocumentTemplate, type IssuedDocument } from '@/services/document.service'
import { patientService } from '@/services/patient.service'
import { staffService } from '@/services/staff.service'
import PatientLookup from '@/components/ui/PatientLookup.vue'
import { manilaToday } from '@/utils/booking'
import { elementTitle } from '@/utils/documents/elements'
import { PURPOSES, buildValues } from '@/utils/documents/placeholders'
import { DEFAULT_ACCENT, PRESET_STYLES, presetLayout } from '@/utils/documents/presets'
import { buildPrintHtml } from '@/utils/documents/render'
import { sanitizeLayout } from '@/utils/documents/sanitize'
import { DOC_KINDS, PAPER_SIZES, type DocData, type DocKind, type DocLayout, type Medicine } from '@/utils/documents/types'
import { printHtmlDocument } from '@/utils/receipt'
import type { Patient, Profile } from '@/types'
import DocumentPreview from './DocumentPreview.vue'

const props = defineProps<{ initialPatientId?: string; initialKind?: DocKind }>()
defineEmits<{ (e: 'show-history'): void }>()

const auth = useAuthStore()
const branchStore = useBranchStore()

const kind = ref<DocKind>(props.initialKind ?? 'medcert')
const patient = ref<Patient | null>(null)
const doctors = ref<Profile[]>([])
const doctorId = ref('')
const date = ref(manilaToday())
const templates = ref<DocumentTemplate[]>([])
const logoUrl = ref<string | null>(null)
const accent = ref(DEFAULT_ACCENT)

const cert = ref({ purpose: '', diagnosis: '', remarks: '', restDays: '' as string | number, validUntil: '' })
const rx = ref({ diagnosis: '', remarks: '', followUp: '' })
const medicines = ref<Medicine[]>([{ name: '', sig: '', qty: '' }])

const issuing = ref(false)
const issued = ref<IssuedDocument | null>(null)
const errorMsg = ref('')
const overflowIds = ref<string[]>([])
const overflowOk = ref(false)

// ── Designs to choose from ──
interface TemplateOption { id: string; label: string; layout: DocLayout; savedId: string | null }

const savedForKind = computed(() => templates.value.filter(t => t.kind === kind.value))
const options = computed<TemplateOption[]>(() => [
  ...savedForKind.value.map(t => ({ id: t.id, label: t.name + (t.is_default ? ' (default)' : ''), layout: t.layout, savedId: t.id })),
  ...PRESET_STYLES.map(p => ({
    id: `builtin:${p.key}`, label: p.label.split(' (')[0], savedId: null,
    layout: presetLayout(kind.value, p.key, { accent: accent.value }),
  })),
])

const templateId = ref('builtin:classic')
const chosen = computed(() => options.value.find(o => o.id === templateId.value) ?? options.value[0])
const layout = computed(() => sanitizeLayout(chosen.value.layout))

function pickDefaultTemplate() {
  const saved = savedForKind.value.find(t => t.is_default) ?? savedForKind.value[0]
  templateId.value = saved ? saved.id : 'builtin:classic'
}

// ── What goes on the page ──
const doctorName = computed(() => doctors.value.find(d => d.id === doctorId.value)?.full_name ?? '')

const values = computed(() => {
  const p = patient.value
  return buildValues(
    kind.value,
    {
      clinicName: auth.clinic?.name ?? 'Clinic',
      clinicEmail: auth.clinic?.email ?? null,
      clinicAddress: auth.clinic?.address ?? null,
      clinicPhone: auth.clinic?.phone ?? null,
      branch: branchStore.branches.find(b => b.id === p?.branch_id) ?? null,
      patient: p ?? { full_name: 'Patient name' },
      doctorName: doctorName.value || 'Doctor name',
      today: manilaToday(),
    },
    kind.value === 'medcert' ? { date: date.value, ...cert.value } : { date: date.value, ...rx.value },
  )
})

const cleanMedicines = computed<Medicine[]>(() =>
  medicines.value.map(m => ({ name: m.name.trim(), sig: m.sig.trim(), qty: m.qty.trim() })).filter(m => m.name))

const previewData = computed<DocData>(() => ({
  values: { ...values.value, document_number: '(assigned when issued)' },
  medicines: cleanMedicines.value,
  logoUrl: logoUrl.value,
}))

const overflowNames = computed(() =>
  overflowIds.value.map(id => layout.value.elements.find(e => e.id === id)).filter(Boolean).map(e => elementTitle(e!)))

const canIssue = computed(() =>
  !!patient.value && !!doctorId.value && !!date.value &&
  (kind.value === 'medcert' || cleanMedicines.value.length > 0) &&
  (overflowNames.value.length === 0 || overflowOk.value))

function addMedicine() { if (medicines.value.length < 40) medicines.value.push({ name: '', sig: '', qty: '' }) }
function removeMedicine(i: number) { if (medicines.value.length > 1) medicines.value.splice(i, 1) }

function setKind(next: DocKind) {
  if (kind.value === next) return
  kind.value = next
  overflowOk.value = false
  pickDefaultTemplate()
}

function reset() {
  patient.value = null
  doctorId.value = defaultDoctor()
  date.value = manilaToday()
  cert.value = { purpose: '', diagnosis: '', remarks: '', restDays: '', validUntil: '' }
  rx.value = { diagnosis: '', remarks: '', followUp: '' }
  medicines.value = [{ name: '', sig: '', qty: '' }]
  errorMsg.value = ''
  overflowOk.value = false
}

function startAnother() {
  issued.value = null
  reset()
}

watch([templateId, kind], () => { overflowOk.value = false })

// ── Issuing and printing ──
function printDoc(doc: IssuedDocument) {
  printHtmlDocument(buildPrintHtml(doc.layout, doc.data, { clinicLogoUrl: doc.data.logoUrl ?? logoUrl.value, title: doc.number }))
}

async function issue() {
  if (!canIssue.value || !patient.value || issuing.value) return
  issuing.value = true
  errorMsg.value = ''

  const { data, error } = await documentService.issue({
    kind: kind.value,
    patient_id: patient.value.id,
    doctor_id: doctorId.value,
    template_id: chosen.value.savedId,
    layout: layout.value,
    data: { values: values.value, medicines: cleanMedicines.value, logoUrl: logoUrl.value },
  })
  issuing.value = false

  if (error || !data) {
    errorMsg.value = error ?? 'Could not issue the document.'
    return
  }
  issued.value = data
  printDoc(data)
}

// ── Loading ──
function defaultDoctor(): string {
  const me = auth.profile
  return me && ['doctor', 'admin'].includes(me.role) && doctors.value.some(d => d.id === me.id) ? me.id : ''
}

onMounted(async () => {
  const clinicId = auth.clinic?.id
  if (!clinicId) return
  const [tpl, staff, branding] = await Promise.all([
    documentService.listTemplates(clinicId),
    staffService.getAll(clinicId),
    clinicService.getClinicBranding(clinicId),
  ])
  templates.value = tpl.data ?? []
  doctors.value = (staff.data ?? []).filter(s => s.role === 'doctor' || s.role === 'admin')
  logoUrl.value = branding.data?.logo_url ?? null
  accent.value = branding.data?.primary_color ?? DEFAULT_ACCENT
  doctorId.value = defaultDoctor()
  pickDefaultTemplate()

  if (props.initialPatientId) {
    const { data } = await patientService.getById(clinicId, props.initialPatientId)
    if (data) patient.value = data
  }
})
</script>

<style scoped>
.lbl { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.25rem; }
.inp { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.6rem 0.75rem; font-size: 0.85rem; background: #f8fafc; transition: all .15s; }
.inp:focus { outline: 2px solid #38bdf8; background: #fff; }
</style>
