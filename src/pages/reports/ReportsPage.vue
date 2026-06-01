<template>
  <AppLayout>
    <div class="space-y-6">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Reports</h1>
        <p class="text-sm text-slate-400 mt-0.5">Generate and print clinic documents for your patients</p>
      </div>

      <!-- Report Type Selector -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="type in reportTypes" :key="type.id"
          @click="selectReportType(type.id)"
          :class="[
            'flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left',
            activeType === type.id
              ? 'border-sky-400 bg-sky-50 shadow-sm'
              : 'border-gray-100 bg-white hover:border-sky-200 hover:shadow-sm'
          ]">
          <div :class="['w-12 h-12 rounded-xl flex items-center justify-center shrink-0', type.bg]">
            <span :class="['material-icons text-2xl', type.iconColor]">{{ type.icon }}</span>
          </div>
          <div>
            <p class="font-bold text-slate-800 text-sm">{{ type.label }}</p>
            <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">{{ type.desc }}</p>
          </div>
        </button>
      </div>

      <!-- Form Panel -->
      <div v-if="activeType" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        <h2 class="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span class="material-icons text-sky-500 text-base">edit_note</span>
          Fill in Details
        </h2>

        <!-- Patient search -->
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Patient *</label>
          <div class="relative">
            <input
              v-model="patientSearch"
              @input="searchPatients"
              @focus="showPatientDropdown = true"
              type="text"
              placeholder="Search patient name…"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all pr-8" />
            <span class="material-icons text-slate-300 text-base absolute right-3 top-2.5">search</span>
            <!-- Dropdown -->
            <div v-if="showPatientDropdown && filteredPatients.length > 0"
              class="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              <button
                v-for="p in filteredPatients" :key="p.id"
                @click="selectPatient(p)"
                class="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors flex items-center gap-3">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center text-xs font-bold text-sky-600 shrink-0">
                  {{ p.full_name.charAt(0) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-800">{{ p.full_name }}</p>
                  <p class="text-[11px] text-slate-400">{{ p.contact_number }}</p>
                </div>
              </button>
            </div>
          </div>
          <p v-if="selectedPatient" class="mt-1.5 text-xs text-green-600 font-semibold flex items-center gap-1">
            <span class="material-icons text-sm">check_circle</span>
            {{ selectedPatient.full_name }}
          </p>
        </div>

        <!-- Doctor -->
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Attending Doctor *</label>
          <select v-model="form.doctorId"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
            <option value="">Select doctor…</option>
            <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
          </select>
        </div>

        <!-- Date -->
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Date</label>
          <input v-model="form.date" type="date"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
        </div>

        <!-- MEDICAL CERTIFICATE fields -->
        <template v-if="activeType === 'medcert'">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Purpose of Certificate</label>
            <select v-model="form.purpose"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
              <option value="">Select purpose…</option>
              <option value="employment">Employment / Work</option>
              <option value="school">School / Academic</option>
              <option value="travel">Travel Clearance</option>
              <option value="insurance">Insurance</option>
              <option value="legal">Legal / Court</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Diagnosis / Findings</label>
            <textarea v-model="form.diagnosis" rows="3" placeholder="e.g. Patient was examined and found to be in good health…"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all resize-none"></textarea>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Recommendation / Remarks</label>
            <textarea v-model="form.remarks" rows="2" placeholder="e.g. Fit to work, No restrictions…"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Days of Rest / Leave (optional)</label>
              <input v-model="form.restDays" type="number" min="0" placeholder="e.g. 3"
                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Valid Until (optional)</label>
              <input v-model="form.validUntil" type="date"
                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
            </div>
          </div>
        </template>

        <!-- PRESCRIPTION fields -->
        <template v-if="activeType === 'prescription'">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Diagnosis</label>
            <input v-model="form.diagnosis" type="text" placeholder="e.g. Upper Respiratory Tract Infection"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
          </div>

          <!-- Medicines -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Medicines (Rx)</label>
              <button @click="addMedicine"
                class="flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                <span class="material-icons text-sm">add_circle</span> Add Medicine
              </button>
            </div>
            <div v-for="(med, i) in form.medicines" :key="i" class="flex gap-2 mb-2 items-start">
              <div class="flex-1 space-y-1.5">
                <input v-model="med.name" type="text" placeholder="Drug name & strength (e.g. Amoxicillin 500mg)"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
                <input v-model="med.sig" type="text" placeholder="Sig: e.g. 1 cap TID x 7 days"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
              </div>
              <button @click="removeMedicine(i)" class="mt-2 text-slate-300 hover:text-red-400 transition-colors">
                <span class="material-icons text-lg">remove_circle_outline</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Additional Notes / Instructions</label>
            <textarea v-model="form.remarks" rows="2" placeholder="e.g. Avoid alcohol. Complete the full course."
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all resize-none"></textarea>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Follow-up Date (optional)</label>
            <input v-model="form.followUp" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all" />
          </div>
        </template>

        <!-- Generate Button -->
        <div class="pt-2 flex gap-3">
          <button @click="generateDocument"
            :disabled="!canGenerate"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-icons text-sm">description</span>
            Preview & Print
          </button>
          <button v-if="activeType" @click="resetForm"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all">
            <span class="material-icons text-sm">restart_alt</span>
            Reset
          </button>
        </div>
      </div>

    </div>

    <!-- Print Modal -->
    <Teleport to="body">
      <div v-if="showPrintModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h3 class="font-bold text-slate-800">Document Preview</h3>
            <div class="flex items-center gap-2">
              <button @click="printDocument"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition-all">
                <span class="material-icons text-sm">print</span> Print
              </button>
              <button @click="showPrintModal = false"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                <span class="material-icons text-lg">close</span>
              </button>
            </div>
          </div>
          <!-- Modal body — scrollable preview -->
          <div class="flex-1 overflow-y-auto p-6">
            <div id="printable-doc" v-html="documentHtml" class="font-serif text-slate-900 text-sm leading-relaxed"></div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Print styles injected into head -->
    <Teleport to="head">
      <style>
        @media print {
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
          #printable-doc { font-size: 12pt; line-height: 1.6; }
        }
      </style>
    </Teleport>

  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import { patientService } from '@/services/patient.service'
import { staffService } from '@/services/staff.service'
import type { Patient, Profile } from '@/types'

const authStore = useAuthStore()

// ── Report type config ─────────────────────────────────────────
const reportTypes = [
  {
    id: 'medcert',
    label: 'Medical Certificate',
    desc: 'Official certificate for employment, school, travel, or legal purposes.',
    icon: 'verified',
    bg: 'bg-sky-50',
    iconColor: 'text-sky-500',
  },
  {
    id: 'prescription',
    label: 'Prescription (Rx)',
    desc: 'Doctor prescription pad with medicines and sig instructions.',
    icon: 'medication',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
]

const activeType = ref<'medcert' | 'prescription' | null>(null)

function selectReportType(id: 'medcert' | 'prescription') {
  activeType.value = id
  resetForm()
}

// ── Data ───────────────────────────────────────────────────────
const patients = ref<Patient[]>([])
const doctors = ref<Profile[]>([])
const patientSearch = ref('')
const selectedPatient = ref<Patient | null>(null)
const showPatientDropdown = ref(false)
const showPrintModal = ref(false)
const documentHtml = ref('')

const form = ref({
  doctorId: '',
  date: new Date().toISOString().split('T')[0],
  diagnosis: '',
  remarks: '',
  purpose: '',
  restDays: '',
  validUntil: '',
  medicines: [{ name: '', sig: '' }],
  followUp: '',
})

const filteredPatients = computed(() => {
  if (!patientSearch.value.trim()) return patients.value.slice(0, 8)
  const q = patientSearch.value.toLowerCase()
  return patients.value.filter(p =>
    p.full_name.toLowerCase().includes(q) || p.contact_number?.includes(q)
  ).slice(0, 8)
})

const canGenerate = computed(() => {
  if (!selectedPatient.value || !form.value.doctorId) return false
  if (activeType.value === 'prescription') {
    return form.value.medicines.some(m => m.name.trim())
  }
  return true
})

// ── Methods ────────────────────────────────────────────────────
function searchPatients() {
  showPatientDropdown.value = true
}

function selectPatient(p: Patient) {
  selectedPatient.value = p
  patientSearch.value = p.full_name
  showPatientDropdown.value = false
}

function addMedicine() {
  form.value.medicines.push({ name: '', sig: '' })
}

function removeMedicine(i: number) {
  if (form.value.medicines.length > 1) form.value.medicines.splice(i, 1)
}

function resetForm() {
  selectedPatient.value = null
  patientSearch.value = ''
  form.value = {
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    remarks: '',
    purpose: '',
    restDays: '',
    validUntil: '',
    medicines: [{ name: '', sig: '' }],
    followUp: '',
  }
}

function getDoctorName() {
  const doc = doctors.value.find(d => d.id === form.value.doctorId)
  return doc?.full_name ?? '—'
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getAge(birthdate: string | null) {
  if (!birthdate) return ''
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age + ' y/o'
}

function purposeLabel(val: string) {
  const map: Record<string, string> = {
    employment: 'Employment / Work',
    school: 'School / Academic',
    travel: 'Travel Clearance',
    insurance: 'Insurance',
    legal: 'Legal / Court',
    other: 'Other Purposes',
  }
  return map[val] || val
}

function generateDocument() {
  const patient = selectedPatient.value!
  const clinic = authStore.clinic
  const doctor = getDoctorName()
  const date = formatDate(form.value.date)
  const age = getAge(patient.birthdate)
  const ageSex = [age, patient.gender ? (patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : 'Other') : ''].filter(Boolean).join(', ')

  if (activeType.value === 'medcert') {
    documentHtml.value = buildMedCert({ patient, clinic, doctor, date, ageSex })
  } else {
    documentHtml.value = buildPrescription({ patient, clinic, doctor, date, ageSex })
  }
  showPrintModal.value = true
}

function buildMedCert({ patient, clinic, doctor, date, ageSex }: any) {
  const purpose = form.value.purpose ? purposeLabel(form.value.purpose) : ''
  const restDays = form.value.restDays ? `<p style="margin:6px 0">The patient is advised to rest for <strong>${form.value.restDays} day(s)</strong>.</p>` : ''
  const validUntil = form.value.validUntil ? `<p style="margin:6px 0;font-size:11pt;color:#64748b">Valid until: ${formatDate(form.value.validUntil)}</p>` : ''

  return `
    <div style="max-width:680px;margin:0 auto;padding:40px 48px;font-family:Georgia,serif;color:#1e293b;border:1px solid #e2e8f0">
      <!-- Clinic Header -->
      <div style="text-align:center;border-bottom:2px solid #0ea5e9;padding-bottom:16px;margin-bottom:24px">
        <h1 style="margin:0;font-size:18pt;font-weight:bold;letter-spacing:1px;color:#0f172a">${clinic?.name ?? 'Clinic'}</h1>
        <p style="margin:4px 0 0;font-size:10pt;color:#64748b">Medical Certificate</p>
      </div>

      <!-- Date -->
      <p style="text-align:right;font-size:10pt;color:#64748b;margin-bottom:20px">Date: <strong>${date}</strong></p>

      <!-- To Whom -->
      ${purpose ? `<p style="margin-bottom:16px;font-size:11pt">To Whom It May Concern (${purpose}):</p>` : '<p style="margin-bottom:16px;font-size:11pt">To Whom It May Concern:</p>'}

      <!-- Body -->
      <p style="margin-bottom:12px;font-size:11pt;line-height:1.8">
        This is to certify that <strong>${patient.full_name}</strong>${ageSex ? ` (${ageSex})` : ''} was examined at this clinic on <strong>${date}</strong>.
      </p>

      ${form.value.diagnosis ? `
      <p style="margin-bottom:12px;font-size:11pt;line-height:1.8">
        <strong>Findings / Diagnosis:</strong><br/>
        ${form.value.diagnosis}
      </p>` : ''}

      ${form.value.remarks ? `
      <p style="margin-bottom:12px;font-size:11pt;line-height:1.8">
        <strong>Recommendation:</strong><br/>
        ${form.value.remarks}
      </p>` : ''}

      ${restDays}
      ${validUntil}

      <p style="margin-top:4px;font-size:11pt;line-height:1.8">
        This certificate is issued upon the request of the patient for whatever legal purpose it may serve.
      </p>

      <!-- Signature -->
      <div style="margin-top:56px">
        <div style="border-top:1px solid #1e293b;width:220px;padding-top:6px">
          <p style="margin:0;font-weight:bold;font-size:11pt">Dr. ${doctor}</p>
          <p style="margin:2px 0 0;font-size:10pt;color:#64748b">Attending Physician</p>
          <p style="margin:2px 0 0;font-size:10pt;color:#64748b">${clinic?.name ?? ''}</p>
        </div>
      </div>
    </div>
  `
}

function buildPrescription({ patient, clinic, doctor, date, ageSex }: any) {
  const meds = form.value.medicines.filter(m => m.name.trim())
  const medsHtml = meds.map((m, i) => `
    <div style="margin-bottom:16px;padding-left:12px;border-left:3px solid #a855f7">
      <p style="margin:0;font-weight:bold;font-size:12pt">${i + 1}. ${m.name}</p>
      ${m.sig ? `<p style="margin:4px 0 0;font-size:10pt;color:#475569">Sig: ${m.sig}</p>` : ''}
    </div>
  `).join('')

  const followUp = form.value.followUp ? `<p style="margin-top:20px;font-size:10pt;color:#64748b"><strong>Follow-up:</strong> ${formatDate(form.value.followUp)}</p>` : ''

  return `
    <div style="max-width:680px;margin:0 auto;padding:40px 48px;font-family:Georgia,serif;color:#1e293b;border:1px solid #e2e8f0">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #a855f7;padding-bottom:16px;margin-bottom:24px">
        <div>
          <h1 style="margin:0;font-size:18pt;font-weight:bold;color:#0f172a">${clinic?.name ?? 'Clinic'}</h1>
          <p style="margin:4px 0 0;font-size:10pt;color:#64748b">Prescription</p>
        </div>
        <div style="text-align:right;font-size:10pt;color:#64748b">
          <p style="margin:0">Date: <strong>${date}</strong></p>
          <p style="margin:4px 0 0">Dr. ${doctor}</p>
        </div>
      </div>

      <!-- Patient Info -->
      <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:24px">
        <p style="margin:0;font-size:11pt"><strong>Patient:</strong> ${patient.full_name}${ageSex ? ` &nbsp;|&nbsp; ${ageSex}` : ''}</p>
        ${form.value.diagnosis ? `<p style="margin:4px 0 0;font-size:10pt;color:#475569"><strong>Dx:</strong> ${form.value.diagnosis}</p>` : ''}
      </div>

      <!-- Rx Symbol -->
      <p style="font-size:22pt;font-weight:bold;color:#a855f7;margin:0 0 16px">℞</p>

      <!-- Medicines -->
      ${medsHtml}

      <!-- Notes -->
      ${form.value.remarks ? `
      <div style="margin-top:20px;padding:12px 16px;background:#faf5ff;border-radius:8px;border:1px solid #e9d5ff">
        <p style="margin:0;font-size:10pt;color:#475569"><strong>Notes:</strong> ${form.value.remarks}</p>
      </div>` : ''}

      ${followUp}

      <!-- Signature -->
      <div style="margin-top:56px">
        <div style="border-top:1px solid #1e293b;width:220px;padding-top:6px">
          <p style="margin:0;font-weight:bold;font-size:11pt">Dr. ${doctor}</p>
          <p style="margin:2px 0 0;font-size:10pt;color:#64748b">Attending Physician</p>
          <p style="margin:2px 0 0;font-size:10pt;color:#64748b">${clinic?.name ?? ''}</p>
        </div>
      </div>
    </div>
  `
}

function printDocument() {
  const content = document.getElementById('printable-doc')?.innerHTML
  if (!content) return
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Document</title>
      <style>
        body { margin: 0; padding: 24px; font-family: Georgia, serif; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${content}
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
    </body>
    </html>
  `)
  win.document.close()
}

// ── Load data ──────────────────────────────────────────────────
onMounted(async () => {
  if (!authStore.clinic?.id) return
  const [pRes, sRes] = await Promise.all([
    patientService.getAll(authStore.clinic.id),
    staffService.getAll(authStore.clinic.id),
  ])
  if (pRes.data) patients.value = pRes.data
  if (sRes.data) doctors.value = sRes.data.filter(s => s.role === 'doctor' || s.role === 'admin')
})

// close dropdown on outside click
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) showPatientDropdown.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
import { onUnmounted } from 'vue'
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>