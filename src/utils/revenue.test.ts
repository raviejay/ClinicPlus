import { describe, expect, it } from 'vitest'
import {
  fillDaily, formatMoney, formatMoneyShort, groupPaymentsByDay, isValidRange, manilaDateOf, manilaTimeLabel,
  methodMeta, percentChange, previousRange, rangeFor, rangeLabel, rangeLength, utcBounds,
} from './revenue'
import { buildReceiptHtml, type ReceiptData } from './receipt'

const TODAY = '2026-10-12' // a Monday

describe('rangeFor', () => {
  it('builds the quick ranges in Manila dates', () => {
    expect(rangeFor('today', TODAY)).toEqual({ from: '2026-10-12', to: '2026-10-12' })
    expect(rangeFor('yesterday', TODAY)).toEqual({ from: '2026-10-11', to: '2026-10-11' })
    expect(rangeFor('7d', TODAY)).toEqual({ from: '2026-10-06', to: '2026-10-12' })
    expect(rangeFor('30d', TODAY)).toEqual({ from: '2026-09-13', to: '2026-10-12' })
    expect(rangeFor('month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-12' })
    expect(rangeFor('last_month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
  it('handles last month across a year boundary and in short months', () => {
    expect(rangeFor('last_month', '2027-01-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(rangeFor('last_month', '2026-03-05')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
  it('returns a copy of the custom range, not the object being edited', () => {
    const custom = { from: '2026-01-01', to: '2026-01-31' }
    const range = rangeFor('custom', TODAY, custom)
    custom.to = '2026-02-28'
    expect(range.to).toBe('2026-01-31')
  })
  it('uses the custom range as given', () => {
    expect(rangeFor('custom', TODAY, { from: '2026-01-01', to: '2026-01-31' })).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })
})

describe('previousRange', () => {
  it('is the same number of days right before', () => {
    expect(previousRange({ from: '2026-10-06', to: '2026-10-12' })).toEqual({ from: '2026-09-29', to: '2026-10-05' })
    expect(previousRange({ from: '2026-10-12', to: '2026-10-12' })).toEqual({ from: '2026-10-11', to: '2026-10-11' })
  })
  it('measures length inclusively', () => {
    expect(rangeLength({ from: '2026-10-06', to: '2026-10-12' })).toBe(7)
  })
})

describe('isValidRange', () => {
  it('accepts normal ranges and rejects backwards, malformed and huge ones', () => {
    expect(isValidRange({ from: '2026-10-01', to: '2026-10-12' })).toBe(true)
    expect(isValidRange({ from: '2026-10-12', to: '2026-10-01' })).toBe(false)
    expect(isValidRange({ from: '', to: '2026-10-01' })).toBe(false)
    expect(isValidRange({ from: '2020-01-01', to: '2026-10-01' })).toBe(false)
  })
})

describe('percentChange', () => {
  it('compares to the previous period', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(0, 0)).toBe(0)
    expect(percentChange(120.5, 100)).toBe(20.5)
  })
  it('has no percentage when the previous period was empty', () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe('money', () => {
  it('formats pesos', () => {
    expect(formatMoney(1234.5)).toBe('1,234.50')
    expect(formatMoney(0)).toBe('0.00')
  })
  it('abbreviates chart numbers', () => {
    expect(formatMoneyShort(950)).toBe('950')
    expect(formatMoneyShort(1250)).toBe('1.3k')
    expect(formatMoneyShort(2000)).toBe('2k')
    expect(formatMoneyShort(2_400_000)).toBe('2.4M')
  })
})

describe('Manila days', () => {
  it('puts a payment on its Philippine date, not the UTC date', () => {
    expect(manilaDateOf('2026-10-11T15:59:59')).toBe('2026-10-11') // 23:59:59 Manila
    expect(manilaDateOf('2026-10-11T16:00:00')).toBe('2026-10-12') // midnight Manila
    expect(manilaDateOf('2026-10-12T02:00:00')).toBe('2026-10-12')
  })
  it('shows the Manila clock time', () => {
    expect(manilaTimeLabel('2026-10-12T02:00:00')).toMatch(/10:00\s?AM/i)
    expect(manilaTimeLabel('2026-10-11T16:30:00')).toMatch(/12:30\s?AM/i)
  })
  it('converts a Manila date range to UTC bounds', () => {
    expect(utcBounds({ from: '2026-10-12', to: '2026-10-12' })).toEqual({
      start: '2026-10-11T16:00:00.000',
      end: '2026-10-12T16:00:00.000',
    })
  })
})

describe('labels', () => {
  it('labels single days and ranges', () => {
    expect(rangeLabel({ from: '2026-10-12', to: '2026-10-12' })).toContain('October 12, 2026')
    expect(rangeLabel({ from: '2026-10-06', to: '2026-10-12' })).toBe('Oct 6 – Oct 12, 2026')
    expect(rangeLabel({ from: '2026-12-28', to: '2027-01-03' })).toBe('Dec 28, 2026 – Jan 3, 2027')
  })
  it('knows payment methods, with a fallback', () => {
    expect(methodMeta('gcash').label).toBe('GCash')
    expect(methodMeta('cash').needsReference).toBe(false)
    expect(methodMeta('maya').needsReference).toBe(true)
    expect(methodMeta('crypto').label).toBe('crypto')
  })
})

describe('fillDaily', () => {
  it('adds zero for days with no payments', () => {
    const out = fillDaily({ from: '2026-10-10', to: '2026-10-13' }, [{ date: '2026-10-11', amount: 100 }, { date: '2026-10-13', amount: 50 }])
    expect(out).toEqual([
      { date: '2026-10-10', amount: 0 }, { date: '2026-10-11', amount: 100 },
      { date: '2026-10-12', amount: 0 }, { date: '2026-10-13', amount: 50 },
    ])
  })
})

describe('groupPaymentsByDay', () => {
  const p = (id: string, paid_at: string, amount: number, status = 'paid') => ({ id, paid_at, amount, status })
  it('groups by Manila day, newest first, and totals only paid payments', () => {
    const groups = groupPaymentsByDay([
      p('a', '2026-10-11T15:00:00', 100),            // Oct 11 (Manila 11 PM)
      p('b', '2026-10-11T17:00:00', 200),            // Oct 12 (Manila 1 AM)
      p('c', '2026-10-12T02:00:00', 300),            // Oct 12
      p('d', '2026-10-12T03:00:00', 400, 'refunded'), // Oct 12, refunded: not in the total
    ])
    expect(groups.map(g => g.date)).toEqual(['2026-10-12', '2026-10-11'])
    expect(groups[0].items.map(i => i.id)).toEqual(['d', 'c', 'b'])
    expect(groups[0].total).toBe(500)
    expect(groups[1].total).toBe(100)
  })
})

describe('receipt', () => {
  const base: ReceiptData = {
    clinicName: 'Demo <Clinic>', branchName: 'North', address: '1 Main St', phone: '0917',
    receiptNumber: 'R-000123', paidAt: '2026-10-12T02:00:00', patientName: 'Juan "JD" Cruz',
    description: 'Check-up', method: 'gcash', reference: 'GC-99', amount: 1500, status: 'paid', recordedBy: 'Ana',
  }
  it('shows the receipt number, amount and details', () => {
    const html = buildReceiptHtml(base)
    expect(html).toContain('R-000123')
    expect(html).toContain('₱1,500.00')
    expect(html).toContain('GCash')
    expect(html).toContain('GC-99')
    expect(html).toContain('Check-up')
    expect(html).toContain('not an official BIR receipt')
  })
  it('escapes anything typed by users', () => {
    const html = buildReceiptHtml(base)
    expect(html).not.toContain('<Clinic>')
    expect(html).toContain('Demo &lt;Clinic&gt;')
    expect(html).toContain('Juan &quot;JD&quot; Cruz')
  })
  it('stamps refunded and voided receipts with the reason', () => {
    const refunded = buildReceiptHtml({ ...base, status: 'refunded', statusReason: 'Changed mind' })
    expect(refunded).toContain('REFUNDED')
    expect(refunded).toContain('Changed mind')
    expect(buildReceiptHtml({ ...base, status: 'voided', statusReason: 'Typo' })).toContain('VOID')
    expect(buildReceiptHtml(base)).not.toContain('class="stamp"')
  })
  it('leaves out empty lines', () => {
    const html = buildReceiptHtml({ ...base, reference: null, description: null, recordedBy: null })
    expect(html).not.toContain('Reference')
    expect(html).not.toContain('Received by')
  })
})
