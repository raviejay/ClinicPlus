// Starting points for the designer. Every clinic can use these as they are, or open one in the
// designer and change anything. They contain everything a certificate or prescription normally needs.

import { makeBox, makeImage, makeLine, makeMedicines, makeText } from './elements'
import type { DocElement, DocKind, DocLayout, PaperSize } from './types'

export type PresetStyle = 'classic' | 'modern' | 'minimal'

export const PRESET_STYLES: { key: PresetStyle; label: string; description: string }[] = [
  { key: 'classic', label: 'Classic', description: 'Centered letterhead with a rule, like a traditional clinic.' },
  { key: 'modern', label: 'Modern', description: 'A bold color band with your name and logo across the top.' },
  { key: 'minimal', label: 'Plain (pre-printed paper)', description: 'No header. Print on stationery that already carries your letterhead.' },
]

export const DEFAULT_ACCENT = '#0ea5e9'

export interface PresetOptions {
  accent?: string
  paper?: PaperSize
}

const GRAY = '#64748b'
// Filled in from Settings (address and phone); a line with nothing to show is left out
const LETTERHEAD_PLACEHOLDER = '{clinic_address}\n{clinic_phone_line}'

function certificateBody(style: PresetStyle, accent: string, W: number, H: number): DocElement[] {
  const left = 20
  const width = W - 40
  const top = style === 'minimal' ? 56 : 64
  return [
    makeText('title', left, top, width, 9, 'MEDICAL CERTIFICATE', {
      size: 15, bold: true, align: style === 'modern' ? 'left' : 'center', color: style === 'modern' ? accent : '#0f172a', name: 'Title',
    }),
    makeText('date', W - 20 - 80, top + 14, 80, 7, 'Date: {date}', { size: 10.5, align: 'right', name: 'Date' }),
    makeText('salutation', left, top + 24, width, 8, 'To Whom It May Concern{purpose_suffix}:', { size: 11, name: 'Salutation' }),
    makeText(
      'body', left, top + 36, width, Math.max(30, H - (top + 36) - 66),
      'This is to certify that {patient_name}{patient_age_sex_paren} was examined at this clinic on {date}.\n\n' +
      '{diagnosis_block}\n\n{remarks_block}\n\n{rest_days_sentence}\n\n{valid_until_line}\n\n' +
      'This certificate is issued upon the request of the patient for whatever legal purpose it may serve.',
      { size: 11.5, lineHeight: 1.7, align: 'justify', name: 'Body' },
    ),
    makeLine('sig-line', W - 20 - 70, H - 51, 70, { name: 'Signature line' }),
    makeText('doctor', W - 20 - 70, H - 49, 70, 7, '{doctor_name}', { size: 11, bold: true, align: 'center', name: 'Doctor' }),
    makeText('doctor-role', W - 20 - 70, H - 42, 70, 11, 'Attending Physician\n{clinic_name}', { size: 9, color: GRAY, align: 'center', lineHeight: 1.3, name: 'Doctor title' }),
    makeText('docno', left, H - 21, width, 5, 'Doc. No. {document_number}', { size: 8, color: GRAY, name: 'Document number' }),
  ]
}

function prescriptionBody(style: PresetStyle, accent: string, W: number, H: number): DocElement[] {
  const left = 10
  const width = W - 20
  const top = style === 'minimal' ? 30 : 36
  return [
    makeBox('patient-box', left, top, width, 24, {
      fill: '#f8fafc', border: { width: 0.2, color: style === 'modern' ? accent : '#e2e8f0', radius: 1.5, style: 'solid' }, name: 'Patient box',
    }),
    makeText('patient', left + 3, top + 2, width - 50, 20, 'Patient: {patient_name}\nAge / Sex: {patient_age_sex}\nAddress: {patient_address}', {
      size: 10, lineHeight: 1.45, name: 'Patient details',
    }),
    makeText('date', left + width - 3 - 40, top + 2, 40, 7, 'Date: {date_short}', { size: 10, align: 'right', name: 'Date' }),
    makeText('dx', left, top + 28, width, 7, '{diagnosis_line}', { size: 10, color: '#475569', name: 'Diagnosis' }),
    makeMedicines('meds', left, top + 38, width, H - top - 38 - 56, { size: 11.5, color: '#1e293b', name: 'Medicines' }),
    makeText('notes', left, H - 54, width, 22, '{remarks_block}\n{follow_up_line}', { size: 9.5, lineHeight: 1.45, name: 'Notes and follow-up' }),
    makeLine('sig-line', W - 10 - 62, H - 28, 62, { name: 'Signature line' }),
    makeText('doctor', W - 10 - 62, H - 26, 62, 6, '{doctor_name}', { size: 10.5, bold: true, align: 'center', name: 'Doctor' }),
    makeText('doctor-role', W - 10 - 62, H - 20, 62, 6, 'Attending Physician', { size: 8.5, color: GRAY, align: 'center', name: 'Doctor title' }),
    makeText('docno', left, H - 10, 70, 5, 'Rx No. {document_number}', { size: 7.5, color: GRAY, name: 'Document number' }),
  ]
}

function header(kind: DocKind, style: PresetStyle, accent: string, W: number): DocElement[] {
  if (style === 'minimal') return []

  const small = kind === 'prescription'
  const pad = small ? 10 : 20
  const logo = small ? 17 : 22
  const nameSize = small ? 14 : 18
  const textLeft = pad + logo + 4

  if (style === 'modern') {
    const bandH = small ? 28 : 34
    return [
      makeBox('band', 0, 0, W, bandH, { fill: accent, name: 'Header band' }),
      makeImage('logo', pad, (bandH - logo) / 2, logo, logo, { name: 'Clinic logo', radius: 2 }),
      makeText('clinic', textLeft, bandH / 2 - (small ? 8 : 10), W - textLeft - pad, small ? 8 : 10, '{clinic_name}', {
        size: nameSize, bold: true, color: '#ffffff', name: 'Clinic name',
      }),
      makeText('contact', textLeft, bandH / 2 + (small ? 0 : 1), W - textLeft - pad, 10, LETTERHEAD_PLACEHOLDER, {
        size: small ? 7.5 : 9, color: '#ffffff', lineHeight: 1.3, name: 'Address and contact',
      }),
    ]
  }

  // classic
  const centerW = W - 2 * textLeft
  return [
    makeImage('logo', pad, small ? 8 : 14, logo, logo, { name: 'Clinic logo' }),
    makeText('clinic', textLeft, small ? 8 : 14, centerW, small ? 8 : 10, '{clinic_name}', {
      size: nameSize, bold: true, align: 'center', color: '#0f172a', name: 'Clinic name',
    }),
    makeText('contact', textLeft, small ? 17 : 26, centerW, 12, LETTERHEAD_PLACEHOLDER, {
      size: small ? 7.5 : 9, color: GRAY, align: 'center', lineHeight: 1.3, name: 'Address and contact',
    }),
    makeLine('rule', pad, small ? 29 : 42, W - 2 * pad, { thickness: small ? 0.5 : 0.6, color: accent, name: 'Header rule' }),
  ]
}

/** A ready-made layout for a document type and look */
export function presetLayout(kind: DocKind, style: PresetStyle, options: PresetOptions = {}): DocLayout {
  const accent = options.accent ?? DEFAULT_ACCENT
  const size: PaperSize = options.paper ?? (kind === 'prescription' ? 'a5' : 'a4')
  const dims = { a4: [210, 297], letter: [215.9, 279.4], a5: [148, 210], half_letter: [139.7, 215.9], legal: [215.9, 355.6] }[size]
  const [W, H] = dims

  return {
    version: 1,
    paper: { size, orientation: 'portrait', margin: 8 },
    elements: [
      ...header(kind, style, accent, W),
      ...(kind === 'medcert' ? certificateBody(style, accent, W, H) : prescriptionBody(style, accent, W, H)),
    ],
  }
}
