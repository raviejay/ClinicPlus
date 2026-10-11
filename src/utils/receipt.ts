// Printable payment receipt. Built as a standalone HTML page and printed from a hidden frame,
// so it works on any printer (including 80mm receipt printers) without a popup.

import type { PaymentMethod, PaymentStatus } from '@/types'
import { formatMoney, manilaDateTimeLabel, methodMeta } from './revenue'

export interface ReceiptData {
  clinicName: string
  branchName?: string | null
  address?: string | null
  phone?: string | null
  receiptNumber: string
  /** Stored payment time (UTC, no zone marker) */
  paidAt: string
  patientName: string
  description?: string | null
  method: PaymentMethod
  reference?: string | null
  amount: number
  status: PaymentStatus
  statusReason?: string | null
  recordedBy?: string | null
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function buildReceiptHtml(d: ReceiptData): string {
  const row = (label: string, value: string | null | undefined) =>
    value ? `<tr><td class="k">${escapeHtml(label)}</td><td class="v">${escapeHtml(value)}</td></tr>` : ''

  const stamp = d.status === 'refunded' ? 'REFUNDED' : d.status === 'voided' ? 'VOID' : ''
  const where = [d.clinicName, d.branchName].filter(Boolean).join(' — ')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Receipt ${escapeHtml(d.receiptNumber)}</title>
<style>
  @page { margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; }
  .receipt { max-width: 340px; margin: 0 auto; position: relative; }
  h1 { font-size: 17px; margin: 0; text-align: center; }
  .sub { text-align: center; font-size: 11px; color: #64748b; margin-top: 2px; }
  .title { text-align: center; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin: 14px 0 6px; }
  .no { text-align: center; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px; }
  hr { border: 0; border-top: 1px dashed #cbd5e1; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 3px 0; vertical-align: top; }
  .k { color: #64748b; width: 38%; }
  .v { text-align: right; font-weight: 600; word-break: break-word; }
  .total { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 800; }
  .total .amt { font-size: 20px; }
  .stamp { position: absolute; top: 120px; left: 50%; transform: translateX(-50%) rotate(-14deg); border: 3px solid #b91c1c; color: #b91c1c;
           font-size: 28px; font-weight: 900; letter-spacing: 3px; padding: 2px 14px; opacity: .55; }
  .foot { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 14px; line-height: 1.5; }
</style></head>
<body><div class="receipt">
  <h1>${escapeHtml(where)}</h1>
  ${d.address ? `<div class="sub">${escapeHtml(d.address)}</div>` : ''}
  ${d.phone ? `<div class="sub">${escapeHtml(d.phone)}</div>` : ''}
  <div class="title">Payment Receipt</div>
  <div class="no">${escapeHtml(d.receiptNumber)}</div>
  ${stamp ? `<div class="stamp">${stamp}</div>` : ''}
  <hr>
  <table>
    ${row('Date', manilaDateTimeLabel(d.paidAt))}
    ${row('Patient', d.patientName)}
    ${row('For', d.description)}
    ${row('Method', methodMeta(d.method).label)}
    ${row('Reference', d.reference)}
    ${row('Received by', d.recordedBy)}
  </table>
  <hr>
  <div class="total"><span>Amount</span><span class="amt">₱${formatMoney(d.amount)}</span></div>
  ${stamp && d.statusReason ? `<hr><table>${row(stamp === 'VOID' ? 'Voided because' : 'Refunded because', d.statusReason)}</table>` : ''}
  <div class="foot">Thank you!<br>This is an acknowledgement of payment received and is not an official BIR receipt.</div>
</div></body></html>`
}

/** Prints any standalone HTML page from a hidden frame (no popup to be blocked) */
export function printHtmlDocument(html: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)

  const doc = frame.contentDocument
  const win = frame.contentWindow
  if (!doc || !win) {
    frame.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => setTimeout(() => frame.remove(), 500)
  win.addEventListener('afterprint', cleanup)
  // Give the frame a moment to lay out before printing
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 60_000) // fallback if afterprint never fires
  }, 150)
}

export const printReceipt = (data: ReceiptData) => printHtmlDocument(buildReceiptHtml(data))

// ── End-of-day summary ──

export interface DayCloseData {
  clinicName: string
  branchName?: string | null
  dateLabel: string
  /** Net paid per payment method */
  methods: { label: string; amount: number; count: number }[]
  net: number
  paymentCount: number
  refunds: { amount: number; count: number }
  voidedCount: number
  cashExpected: number
  /** What was counted in the drawer; null if not entered */
  cashCounted: number | null
  preparedBy?: string | null
}

export function buildDayCloseHtml(d: DayCloseData): string {
  const where = [d.clinicName, d.branchName].filter(Boolean).join(' — ')
  const variance = d.cashCounted === null ? null : Math.round((d.cashCounted - d.cashExpected) * 100) / 100
  const varianceText = variance === null ? '—'
    : variance === 0 ? 'Balanced'
    : `${variance > 0 ? 'Over' : 'Short'} by ₱${formatMoney(Math.abs(variance))}`

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>End of day — ${escapeHtml(d.dateLabel)}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 16px; max-width: 520px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0; } .sub { color: #64748b; font-size: 12px; margin: 2px 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 6px 0; }
  td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; } td.n, th.n { text-align: right; }
  .big td { font-weight: 800; font-size: 15px; border-top: 2px solid #0f172a; border-bottom: 0; }
  .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 13px; }
  .sign { margin-top: 36px; display: flex; gap: 24px; font-size: 11px; color: #64748b; }
  .sign div { flex: 1; border-top: 1px solid #94a3b8; padding-top: 4px; }
</style></head><body>
  <h1>End-of-day summary</h1>
  <div class="sub">${escapeHtml(where)} · ${escapeHtml(d.dateLabel)}</div>
  <table>
    <tr><th>Method</th><th class="n">Payments</th><th class="n">Amount</th></tr>
    ${d.methods.map(m => `<tr><td>${escapeHtml(m.label)}</td><td class="n">${m.count}</td><td class="n">₱${formatMoney(m.amount)}</td></tr>`).join('')}
    <tr class="big"><td>Net revenue</td><td class="n">${d.paymentCount}</td><td class="n">₱${formatMoney(d.net)}</td></tr>
  </table>
  <div class="box">
    Refunded: ₱${formatMoney(d.refunds.amount)} (${d.refunds.count}) · Voided entries: ${d.voidedCount}
  </div>
  <table>
    <tr><td>Cash expected in drawer</td><td class="n">₱${formatMoney(d.cashExpected)}</td></tr>
    <tr><td>Cash counted</td><td class="n">${d.cashCounted === null ? '—' : '₱' + formatMoney(d.cashCounted)}</td></tr>
    <tr><td><strong>Difference</strong></td><td class="n"><strong>${escapeHtml(varianceText)}</strong></td></tr>
  </table>
  <div class="sign"><div>Prepared by${d.preparedBy ? ': ' + escapeHtml(d.preparedBy) : ''}</div><div>Checked by</div></div>
</body></html>`
}
