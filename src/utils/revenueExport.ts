// Excel export of a revenue period: a summary sheet and one row per payment.
// Runs in the browser (SheetJS); cells are written as plain values, never formulas.

import * as XLSX from 'xlsx'
import type { PaymentWithDetails, RevenueReport } from '@/services/payment.service'
import { manilaDateOf, manilaTimeLabel, methodMeta, rangeLabel, STATUS_META, type DateRange } from './revenue'

export function paymentRows(payments: PaymentWithDetails[]) {
  return payments.map(p => ({
    Date: manilaDateOf(p.paid_at),
    Time: manilaTimeLabel(p.paid_at),
    'Receipt #': p.receipt_number ?? '',
    Patient: p.patients?.full_name ?? '',
    Contact: p.patients?.contact_number ?? '',
    'For': p.description ?? p.appointments?.service_name ?? '',
    Method: methodMeta(p.payment_method).label,
    Reference: p.reference ?? '',
    Amount: Number(p.amount),
    Status: STATUS_META[p.status]?.label ?? p.status,
    'Recorded by': p.recorder?.full_name ?? '',
    Notes: p.notes ?? '',
    'Refund / void reason': p.status_reason ?? '',
  }))
}

export function summaryRows(clinicName: string, range: DateRange, report: RevenueReport | null) {
  const rows: (string | number)[][] = [
    [clinicName],
    ['Revenue report'],
    ['Period', rangeLabel(range)],
    [],
  ]
  if (!report) return rows
  rows.push(
    ['Net revenue', report.totals.net],
    ['Payments', report.totals.count],
    ['Patients who paid', report.totals.patients],
    ['Average payment', report.totals.average],
    ['Refunded', report.refunds.amount],
    [],
    ['By payment method'],
    ...report.by_method.map(m => [methodMeta(m.method).label, m.amount, m.count]),
    [],
    ['By service'],
    ...report.by_service.map(s => [s.service, s.amount, s.count]),
    [],
    ['By doctor'],
    ...report.by_doctor.map(d => [d.name, d.amount, d.count]),
    [],
    ['By day'],
    ...report.daily.map(d => [String(d.date).slice(0, 10), d.amount, d.count]),
  )
  return rows
}

export function exportRevenueToExcel(opts: {
  clinicName: string
  range: DateRange
  report: RevenueReport | null
  payments: PaymentWithDetails[]
}) {
  const book = XLSX.utils.book_new()

  const summary = XLSX.utils.aoa_to_sheet(summaryRows(opts.clinicName, opts.range, opts.report))
  summary['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(book, summary, 'Summary')

  const rows = paymentRows(opts.payments)
  const transactions = XLSX.utils.json_to_sheet(rows)
  transactions['!cols'] = [
    { wch: 12 }, { wch: 9 }, { wch: 11 }, { wch: 24 }, { wch: 14 }, { wch: 24 },
    { wch: 9 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 28 }, { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(book, transactions, 'Transactions')

  const safeName = opts.clinicName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'clinic'
  XLSX.writeFile(book, `revenue-${safeName}-${opts.range.from}-to-${opts.range.to}.xlsx`)
}
