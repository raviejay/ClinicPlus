// Exports a patient's full chart (demographics, visit history,
// prescriptions, appointments, billing) to a downloadable .xlsx file.
// Runs entirely client-side via SheetJS — no server call needed.

import * as XLSX from 'xlsx'
import type { Patient } from '@/types'
import type { MedicalRecordWithDetails } from '@/services/medical-record.service'
import type { Payment } from '@/types'
import type { Appointment } from '@/types'

type AppointmentWithDoctor = Appointment & {
  profiles: { full_name: string | null } | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function exportPatientToExcel(
  patient: Patient,
  records: MedicalRecordWithDetails[],
  appointments: AppointmentWithDoctor[],
  payments: Payment[],
) {
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Demographics ---
  const demoRows = [
    ['Full Name', patient.full_name],
    ['Contact Number', patient.contact_number],
    ['Email', patient.email ?? ''],
    ['Birthdate', formatDate(patient.birthdate)],
    ['Gender', patient.gender ?? ''],
    ['Address', patient.address ?? ''],
    ['Patient Since', formatDate(patient.created_at)],
    ['Record ID', patient.id],
  ]
  const demoSheet = XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...demoRows])
  demoSheet['!cols'] = [{ wch: 18 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, demoSheet, 'Demographics')

  // --- Sheet 2: Visit History (medical records) ---
  const recordRows = records.map(r => ({
    'Visit Date': formatDate(r.visit_date),
    'Doctor': r.profiles?.full_name ?? 'Unknown',
    'Diagnosis': r.diagnosis ?? '',
    'Prescription': r.prescription ?? '',
    'Notes': r.notes ?? '',
  }))
  const recordSheet = XLSX.utils.json_to_sheet(
    recordRows.length ? recordRows : [{ 'Visit Date': '', Doctor: '', Diagnosis: '', Prescription: '', Notes: '' }]
  )
  recordSheet['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, recordSheet, 'Visit History')

  // --- Sheet 3: Appointments ---
  const apptRows = appointments.map(a => ({
    'Date': formatDate(a.appointment_date),
    'Time': a.time_slot ?? '',
    'Doctor': a.profiles?.full_name ?? 'Unassigned',
    'Service': a.service_name ?? '',
    'Status': a.status,
    'Notes': a.notes ?? '',
  }))
  const apptSheet = XLSX.utils.json_to_sheet(
    apptRows.length ? apptRows : [{ Date: '', Time: '', Doctor: '', Service: '', Status: '', Notes: '' }]
  )
  apptSheet['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 14 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, apptSheet, 'Appointments')

  // --- Sheet 4: Billing ---
  const paymentRows = payments.map(p => ({
    'Date Paid': formatDateTime(p.paid_at),
    'Amount': Number(p.amount),
    'Method': p.payment_method,
    'Status': p.status,
  }))
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const paymentSheet = XLSX.utils.json_to_sheet(
    paymentRows.length ? paymentRows : [{ 'Date Paid': '', Amount: '', Method: '', Status: '' }]
  )
  XLSX.utils.sheet_add_aoa(paymentSheet, [['Total Paid', totalPaid]], { origin: -1 })
  paymentSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, paymentSheet, 'Billing')

  // --- Filename: PatientName_YYYY-MM-DD.xlsx ---
  const safeName = patient.full_name.replace(/[^a-z0-9]+/gi, '_')
  const today = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${safeName}_${today}.xlsx`)
}

// ============================================================
// Consolidated export — ALL patients' records within a date
// range (the "From" / "To" filters on the Medical Records page).
// Runs entirely client-side via SheetJS, same as above.
// ============================================================

export function exportConsolidatedRecordsToExcel(
  records: MedicalRecordWithDetails[],
  range: { dateFrom?: string; dateTo?: string },
  clinicName?: string,
) {
  const wb = XLSX.utils.book_new()

  const rangeLabel =
    range.dateFrom || range.dateTo
      ? `${range.dateFrom || 'Earliest'} to ${range.dateTo || 'Latest'}`
      : 'All dates'

  // --- Sheet 1: Summary ---
  const uniquePatientIds = new Set(records.map(r => r.patient_id))
  const summaryRows = [
    ['Clinic', clinicName ?? ''],
    ['Date Range', rangeLabel],
    ['Generated On', formatDateTime(new Date().toISOString())],
    ['Total Visits', records.length],
    ['Unique Patients', uniquePatientIds.size],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 18 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // --- Sheet 2: Visit Records (one row per visit, matches Records page) ---
  const visitRows = records.map(r => ({
    'Visit Date': formatDate(r.visit_date),
    'Patient': r.patients?.full_name ?? 'Unknown',
    'Contact Number': r.patients?.contact_number ?? '',
    'Doctor': r.profiles?.full_name ?? 'Unknown',
    'Diagnosis': r.diagnosis ?? '',
    'Prescription': r.prescription ?? '',
    'Notes': r.notes ?? '',
  }))
  const visitSheet = XLSX.utils.json_to_sheet(
    visitRows.length
      ? visitRows
      : [{ 'Visit Date': '', Patient: '', 'Contact Number': '', Doctor: '', Diagnosis: '', Prescription: '', Notes: '' }]
  )
  visitSheet['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, visitSheet, 'Visit Records')

  // --- Sheet 3: Patient Summary (one row per unique patient in range) ---
  type PatientAgg = {
    name: string
    contact: string
    visitCount: number
    firstVisit: string
    lastVisit: string
    lastDiagnosis: string
    doctors: Set<string>
  }
  const byPatient = new Map<string, PatientAgg>()
  for (const r of records) {
    const key = r.patient_id
    const existing = byPatient.get(key)
    const doctorName = r.profiles?.full_name ?? 'Unknown'
    if (!existing) {
      byPatient.set(key, {
        name: r.patients?.full_name ?? 'Unknown',
        contact: r.patients?.contact_number ?? '',
        visitCount: 1,
        firstVisit: r.visit_date,
        lastVisit: r.visit_date,
        lastDiagnosis: r.diagnosis ?? '',
        doctors: new Set([doctorName]),
      })
    } else {
      existing.visitCount += 1
      existing.doctors.add(doctorName)
      if (r.visit_date < existing.firstVisit) existing.firstVisit = r.visit_date
      if (r.visit_date > existing.lastVisit) {
        existing.lastVisit = r.visit_date
        existing.lastDiagnosis = r.diagnosis ?? existing.lastDiagnosis
      }
    }
  }
  const patientRows = Array.from(byPatient.values())
    .sort((a, b) => (a.lastVisit < b.lastVisit ? 1 : -1))
    .map(p => ({
      'Patient': p.name,
      'Contact Number': p.contact,
      'Visits in Range': p.visitCount,
      'First Visit': formatDate(p.firstVisit),
      'Last Visit': formatDate(p.lastVisit),
      'Most Recent Diagnosis': p.lastDiagnosis,
      'Doctor(s) Seen': Array.from(p.doctors).join(', '),
    }))
  const patientSheet = XLSX.utils.json_to_sheet(
    patientRows.length
      ? patientRows
      : [{ Patient: '', 'Contact Number': '', 'Visits in Range': '', 'First Visit': '', 'Last Visit': '', 'Most Recent Diagnosis': '', 'Doctor(s) Seen': '' }]
  )
  patientSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, patientSheet, 'Patient Summary')

  // --- Filename ---
  const today = new Date().toISOString().split('T')[0]
  const fromLabel = range.dateFrom || 'all'
  const toLabel = range.dateTo || today
  XLSX.writeFile(wb, `Patient_Records_${fromLabel}_to_${toLabel}.xlsx`)
}