// {placeholders} that a designer can put in any text element, and how their values are worked out
// from the clinic, patient, doctor and what the person issuing the document typed.

import type { DocKind } from './types'

export type PlaceholderGroup = 'Clinic' | 'Patient' | 'Doctor' | 'Document' | 'Certificate' | 'Prescription'

export interface PlaceholderDef {
  key: string
  label: string
  group: PlaceholderGroup
  kinds: DocKind[]
  sample: string
  /** Empty when the issuer left it blank; a line holding only empty placeholders is dropped */
  hint?: string
}

const BOTH: DocKind[] = ['medcert', 'prescription']
const MC: DocKind[] = ['medcert']
const RX: DocKind[] = ['prescription']

export const PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'clinic_name',   label: 'Clinic name',        group: 'Clinic', kinds: BOTH, sample: 'Sunrise Family Clinic' },
  { key: 'clinic_email',  label: 'Clinic email',       group: 'Clinic', kinds: BOTH, sample: 'hello@sunriseclinic.ph' },
  { key: 'branch_name',   label: 'Branch name',        group: 'Clinic', kinds: BOTH, sample: 'Main Branch', hint: 'Empty for the main clinic' },
  { key: 'branch_address', label: 'Branch address',    group: 'Clinic', kinds: BOTH, sample: '123 Rizal Street, Quezon City', hint: 'Empty for the main clinic' },
  { key: 'branch_phone',  label: 'Branch phone',       group: 'Clinic', kinds: BOTH, sample: '(02) 8123 4567', hint: 'Empty for the main clinic' },

  { key: 'patient_name',    label: 'Patient name',        group: 'Patient', kinds: BOTH, sample: 'Juan Dela Cruz' },
  { key: 'patient_age',     label: 'Patient age',         group: 'Patient', kinds: BOTH, sample: '34 y/o' },
  { key: 'patient_sex',     label: 'Patient sex',         group: 'Patient', kinds: BOTH, sample: 'Male' },
  { key: 'patient_age_sex', label: 'Age and sex',         group: 'Patient', kinds: BOTH, sample: '34 y/o, Male' },
  { key: 'patient_age_sex_paren', label: 'Age and sex in brackets', group: 'Patient', kinds: BOTH, sample: ' (34 y/o, Male)', hint: 'Leading space included' },
  { key: 'patient_address', label: 'Patient address',     group: 'Patient', kinds: BOTH, sample: '45 Mabini St., Manila' },
  { key: 'patient_contact', label: 'Patient contact no.', group: 'Patient', kinds: BOTH, sample: '0917 123 4567' },
  { key: 'patient_birthdate', label: 'Patient birthdate', group: 'Patient', kinds: BOTH, sample: 'March 4, 1992' },

  { key: 'doctor_name', label: 'Doctor name', group: 'Doctor', kinds: BOTH, sample: 'Dr. Maria Reyes' },

  { key: 'date',            label: 'Date (long)',    group: 'Document', kinds: BOTH, sample: 'October 12, 2026' },
  { key: 'date_short',      label: 'Date (short)',   group: 'Document', kinds: BOTH, sample: '10/12/2026' },
  { key: 'document_number', label: 'Document number', group: 'Document', kinds: BOTH, sample: 'MC-000123', hint: 'Assigned when the document is issued' },

  { key: 'purpose',            label: 'Purpose',                    group: 'Certificate', kinds: MC, sample: 'Employment / Work' },
  { key: 'purpose_suffix',     label: 'Purpose in brackets',        group: 'Certificate', kinds: MC, sample: ' (Employment / Work)', hint: 'Leading space included' },
  { key: 'diagnosis',          label: 'Diagnosis / findings',       group: 'Certificate', kinds: MC, sample: 'Acute viral gastroenteritis' },
  { key: 'diagnosis_block',    label: 'Findings with heading',      group: 'Certificate', kinds: MC, sample: 'Findings / Diagnosis:\nAcute viral gastroenteritis', hint: 'Left out when empty' },
  { key: 'remarks',            label: 'Recommendation',             group: 'Certificate', kinds: MC, sample: 'Fit to resume work after rest' },
  { key: 'remarks_block',      label: 'Recommendation with heading', group: 'Certificate', kinds: MC, sample: 'Recommendation:\nFit to resume work after rest', hint: 'Left out when empty' },
  { key: 'rest_days',          label: 'Days of rest',               group: 'Certificate', kinds: MC, sample: '3' },
  { key: 'rest_days_sentence', label: 'Rest sentence',              group: 'Certificate', kinds: MC, sample: 'The patient is advised to rest for 3 day(s).', hint: 'Left out when empty' },
  { key: 'valid_until',        label: 'Valid until',                group: 'Certificate', kinds: MC, sample: 'October 19, 2026' },
  { key: 'valid_until_line',   label: 'Valid-until line',           group: 'Certificate', kinds: MC, sample: 'Valid until: October 19, 2026', hint: 'Left out when empty' },

  { key: 'diagnosis',        label: 'Diagnosis',                group: 'Prescription', kinds: RX, sample: 'Upper respiratory tract infection' },
  { key: 'diagnosis_line',   label: 'Diagnosis with label',     group: 'Prescription', kinds: RX, sample: 'Dx: Upper respiratory tract infection', hint: 'Left out when empty' },
  { key: 'remarks',          label: 'Notes / instructions',     group: 'Prescription', kinds: RX, sample: 'Take after meals. Drink plenty of fluids.' },
  { key: 'remarks_block',    label: 'Notes with label',         group: 'Prescription', kinds: RX, sample: 'Notes: Take after meals. Drink plenty of fluids.', hint: 'Left out when empty' },
  { key: 'follow_up',        label: 'Follow-up date',           group: 'Prescription', kinds: RX, sample: 'October 19, 2026' },
  { key: 'follow_up_line',   label: 'Follow-up line',           group: 'Prescription', kinds: RX, sample: 'Follow-up: October 19, 2026', hint: 'Left out when empty' },
]

/** Placeholders available for a kind (a key that differs per kind is returned once, for that kind) */
export function placeholdersFor(kind: DocKind): PlaceholderDef[] {
  return PLACEHOLDERS.filter(p => p.kinds.includes(kind))
}

export const placeholderKeys = (kind: DocKind) => new Set(placeholdersFor(kind).map(p => p.key))

/** Example values used in the designer and the "sample" preview */
export function sampleValues(kind: DocKind): Record<string, string> {
  return Object.fromEntries(placeholdersFor(kind).map(p => [p.key, p.sample]))
}

export const SAMPLE_MEDICINES = [
  { name: 'Amoxicillin 500 mg capsule', sig: '1 capsule 3 times a day for 7 days', qty: '#21' },
  { name: 'Paracetamol 500 mg tablet', sig: '1 tablet every 6 hours as needed for fever', qty: '#12' },
  { name: 'Cetirizine 10 mg tablet', sig: '1 tablet at bedtime for 5 days', qty: '#5' },
]

// ── Replacing placeholders ──

const TOKEN = /\{([a-z_]+)\}/g

export const placeholdersIn = (content: string): string[] => [...new Set([...content.matchAll(TOKEN)].map(m => m[1]))]

export const unknownPlaceholders = (content: string, kind: DocKind) =>
  placeholdersIn(content).filter(k => !placeholderKeys(kind).has(k))

/**
 * Fills {placeholders} in plain text. A placeholder that is not known stays as written, so a typo is
 * visible. A line whose placeholders are all empty is dropped (with a blank line next to it), so
 * optional details don't leave gaps.
 */
export function fillPlaceholders(content: string, values: Record<string, string>): string {
  const lines = content.split('\n')
  const out: string[] = []
  let justDropped = false

  for (const line of lines) {
    const keys = [...line.matchAll(TOKEN)].map(m => m[1])
    const hasKnown = keys.some(k => k in values)
    const filled = line.replace(TOKEN, (whole, key: string) => (key in values ? values[key] : whole))

    const allEmpty = hasKnown && keys.every(k => !(k in values) || !values[k]?.trim())
    if (allEmpty && filled.trim() === '') {
      justDropped = true
      continue
    }
    if (justDropped && filled.trim() === '' && (out.length === 0 || out[out.length - 1].trim() === '')) {
      justDropped = false
      continue
    }
    justDropped = false
    out.push(filled)
  }
  return out.join('\n')
}

// ── Working out the values ──

export function longDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${iso}T00:00:00Z`))
}

export function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export function ageFrom(birthdate: string | null | undefined, todayIso: string): string {
  if (!birthdate || !/^\d{4}-\d{2}-\d{2}/.test(birthdate)) return ''
  const [by, bm, bd] = birthdate.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = todayIso.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age >= 0 && age < 150 ? `${age} y/o` : ''
}

export const PURPOSES: Record<string, string> = {
  employment: 'Employment / Work',
  school: 'School / Academic',
  travel: 'Travel Clearance',
  insurance: 'Insurance',
  legal: 'Legal / Court',
  other: 'Other Purposes',
}

export interface ValueContext {
  clinicName: string
  clinicEmail?: string | null
  branch?: { name: string; address: string | null; contact_number: string | null } | null
  patient: {
    full_name: string
    birthdate?: string | null
    gender?: string | null
    address?: string | null
    contact_number?: string | null
  }
  doctorName?: string | null
  /** Today in Manila, YYYY-MM-DD, used for the age */
  today: string
}

export interface CertificateForm { date: string; purpose: string; diagnosis: string; remarks: string; restDays: string | number; validUntil: string }
export interface PrescriptionForm { date: string; diagnosis: string; remarks: string; followUp: string }

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

const SEX: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' }

export function doctorDisplayName(name: string | null | undefined): string {
  const n = trim(name)
  if (!n) return ''
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`
}

export function buildValues(
  kind: DocKind,
  ctx: ValueContext,
  form: CertificateForm | PrescriptionForm,
): Record<string, string> {
  const p = ctx.patient
  const age = ageFrom(p.birthdate, ctx.today)
  const sex = p.gender ? SEX[p.gender] ?? '' : ''
  const ageSex = [age, sex].filter(Boolean).join(', ')

  const values: Record<string, string> = {
    clinic_name: ctx.clinicName,
    clinic_email: trim(ctx.clinicEmail),
    branch_name: trim(ctx.branch?.name),
    branch_address: trim(ctx.branch?.address),
    branch_phone: trim(ctx.branch?.contact_number),
    patient_name: trim(p.full_name),
    patient_age: age,
    patient_sex: sex,
    patient_age_sex: ageSex,
    patient_age_sex_paren: ageSex ? ` (${ageSex})` : '',
    patient_address: trim(p.address),
    patient_contact: trim(p.contact_number),
    patient_birthdate: p.birthdate ? longDate(p.birthdate.slice(0, 10)) : '',
    doctor_name: doctorDisplayName(ctx.doctorName),
    date: longDate(form.date),
    date_short: shortDate(form.date),
    document_number: '', // assigned when the document is issued
  }

  if (kind === 'medcert') {
    const f = form as CertificateForm
    const purpose = f.purpose ? PURPOSES[f.purpose] ?? trim(f.purpose) : ''
    const diagnosis = trim(f.diagnosis)
    const remarks = trim(f.remarks)
    const rest = trim(f.restDays)
    const restNum = Number(rest)
    const valid = f.validUntil ? longDate(f.validUntil) : ''
    Object.assign(values, {
      purpose,
      purpose_suffix: purpose ? ` (${purpose})` : '',
      diagnosis,
      diagnosis_block: diagnosis ? `Findings / Diagnosis:\n${diagnosis}` : '',
      remarks,
      remarks_block: remarks ? `Recommendation:\n${remarks}` : '',
      rest_days: rest && restNum > 0 ? String(restNum) : '',
      rest_days_sentence: rest && restNum > 0 ? `The patient is advised to rest for ${restNum} day(s).` : '',
      valid_until: valid,
      valid_until_line: valid ? `Valid until: ${valid}` : '',
    })
  } else {
    const f = form as PrescriptionForm
    const diagnosis = trim(f.diagnosis)
    const remarks = trim(f.remarks)
    const followUp = f.followUp ? longDate(f.followUp) : ''
    Object.assign(values, {
      diagnosis,
      diagnosis_line: diagnosis ? `Dx: ${diagnosis}` : '',
      remarks,
      remarks_block: remarks ? `Notes: ${remarks}` : '',
      follow_up: followUp,
      follow_up_line: followUp ? `Follow-up: ${followUp}` : '',
    })
  }
  return values
}
