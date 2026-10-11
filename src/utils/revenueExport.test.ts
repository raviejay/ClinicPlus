import { describe, expect, it } from 'vitest'
import { paymentRows, summaryRows } from './revenueExport'
import { buildDayCloseHtml } from './receipt'
import type { PaymentWithDetails, RevenueReport } from '@/services/payment.service'

const payment = (over: Partial<PaymentWithDetails> = {}): PaymentWithDetails => ({
  id: 'p1', clinic_id: 'c', branch_id: null, patient_id: 'x', appointment_id: null, amount: 1250.5,
  payment_method: 'gcash', status: 'paid', paid_at: '2026-10-11T17:30:00', created_at: '2026-10-11T17:30:00',
  description: 'Vaccination', notes: 'paid by mother', reference: 'GC-1', receipt_number: 'R-000007',
  recorded_by: 'u', status_reason: null, status_changed_at: null, status_changed_by: null,
  patients: { full_name: 'Juan Cruz', contact_number: '0917' }, appointments: null,
  recorder: { full_name: 'Ana' }, changer: null, ...over,
})

describe('paymentRows (Excel export)', () => {
  it('has one readable row per payment, with Manila date and time', () => {
    const [row] = paymentRows([payment()])
    expect(row).toMatchObject({
      Date: '2026-10-12', // 17:30 UTC is 1:30 AM the next day in Manila
      'Receipt #': 'R-000007', Patient: 'Juan Cruz', Contact: '0917', For: 'Vaccination', Method: 'GCash',
      Reference: 'GC-1', Amount: 1250.5, Status: 'Paid', 'Recorded by': 'Ana', Notes: 'paid by mother',
    })
    expect(row.Time).toMatch(/1:30\s?AM/i)
  })

  it('falls back to the visit service, and shows refund reasons', () => {
    const [row] = paymentRows([payment({
      description: null, appointments: { service_name: 'Check-up', appointment_date: '2026-10-12', time_slot: null },
      status: 'refunded', status_reason: 'Charged twice',
    })])
    expect(row.For).toBe('Check-up')
    expect(row.Status).toBe('Refunded')
    expect(row['Refund / void reason']).toBe('Charged twice')
  })

  it('keeps amounts as numbers so Excel can add them up', () => {
    expect(typeof paymentRows([payment({ amount: '300.00' as unknown as number })])[0].Amount).toBe('number')
  })
})

describe('summaryRows', () => {
  const report: RevenueReport = {
    totals: { net: 700, count: 4, patients: 2, average: 175 }, refunds: { amount: 400, count: 1 },
    daily: [{ date: '2026-10-12', amount: 700, count: 4 }],
    by_method: [{ method: 'cash', amount: 350, count: 2 }], by_doctor: [{ doctor_id: 'd', name: 'Reyes', amount: 300, count: 1 }],
    by_service: [{ service: 'Check-up', amount: 300, count: 1 }], by_branch: [],
  }
  it('lists the period, totals and breakdowns', () => {
    const rows = summaryRows('Demo Clinic', { from: '2026-10-12', to: '2026-10-12' }, report)
    const flat = rows.map(r => r.join('|'))
    expect(flat).toContain('Demo Clinic')
    expect(flat).toContain('Net revenue|700')
    expect(flat).toContain('Refunded|400')
    expect(flat).toContain('Cash|350|2')
    expect(flat).toContain('Check-up|300|1')
    expect(flat).toContain('Reyes|300|1')
    expect(flat).toContain('2026-10-12|700|4')
  })
  it('still works without a report', () => {
    expect(summaryRows('Demo Clinic', { from: '2026-10-12', to: '2026-10-12' }, null).length).toBeGreaterThan(0)
  })
})

describe('end-of-day print', () => {
  const base = {
    clinicName: 'Demo <Clinic>', branchName: null, dateLabel: 'Monday, October 12, 2026',
    methods: [{ label: 'Cash', amount: 500, count: 2 }, { label: 'GCash', amount: 200, count: 1 }],
    net: 700, paymentCount: 3, refunds: { amount: 100, count: 1 }, voidedCount: 2, cashExpected: 500,
  }
  it('shows methods, totals and refunds, and escapes names', () => {
    const html = buildDayCloseHtml({ ...base, cashCounted: 500, preparedBy: 'Ana' })
    expect(html).toContain('₱700.00')
    expect(html).toContain('GCash')
    expect(html).toContain('Refunded: ₱100.00 (1)')
    expect(html).toContain('Voided entries: 2')
    expect(html).toContain('Demo &lt;Clinic&gt;')
    expect(html).toContain('Prepared by: Ana')
  })
  it('reports the cash difference', () => {
    expect(buildDayCloseHtml({ ...base, cashCounted: 500 })).toContain('Balanced')
    expect(buildDayCloseHtml({ ...base, cashCounted: 470 })).toContain('Short by ₱30.00')
    expect(buildDayCloseHtml({ ...base, cashCounted: 520 })).toContain('Over by ₱20.00')
    expect(buildDayCloseHtml({ ...base, cashCounted: null })).not.toContain('Short by')
  })
})
