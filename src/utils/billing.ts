// Billing helpers: where a clinic is in its billing cycle, dates, money, friendly labels.

import type { ClinicPlan } from '@/types'

export const PLAN_ORDER: ClinicPlan[] = ['starter', 'pro', 'premium']

/** Days after the end date during which a lapsed plan still works (matches expire_subscriptions()) */
export const GRACE_DAYS = 3
/** Start nudging to renew this many days before the end date */
export const DUE_SOON_DAYS = 7

const MS_PER_DAY = 86_400_000

/**
 * Timestamps from the database are UTC but have no time-zone marker, which the browser
 * would read as local time. Treat them as UTC.
 */
export function parseDbTimestamp(value: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`)
}

/** Whole days from `now` until `value` (negative once it has passed), rounded up */
export function daysUntil(value: string, now: Date = new Date()): number {
  return Math.ceil((parseDbTimestamp(value).getTime() - now.getTime()) / MS_PER_DAY)
}

/** Adds calendar months, clamping to the last day (Jan 31 + 1 month = Feb 28) */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseDbTimestamp(value) : value
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })
}

/** Amount stored in centavos → "₱599.00" */
export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Plan prices are whole pesos: 899 → "₱899" */
export function formatPesoWhole(pesos: number): string {
  return `₱${pesos.toLocaleString('en-PH')}`
}

/** Limits at or above this are shown as "Unlimited" */
export const UNLIMITED = 999_999
export const formatLimit = (value: number) => (value >= UNLIMITED ? 'Unlimited' : value.toLocaleString('en-PH'))

export interface SubscriptionLike {
  plan: ClinicPlan
  status: string
  reference_number: string
  billing_date: string
  next_billing_date: string
}

/** The free-trial subscription row created at signup (not a paid plan) */
export const isTrialSubscription = (sub: Pick<SubscriptionLike, 'reference_number'> | null | undefined) =>
  !!sub && sub.reference_number.startsWith('TRIAL-')

export type BillingState =
  | 'trial'        // free trial running
  | 'trial_ended'  // trial over, no plan chosen: read-only
  | 'active'       // paid, comfortably before the end date
  | 'due_soon'     // paid, ends within DUE_SOON_DAYS
  | 'grace'        // end date passed, still inside the grace period
  | 'lapsed'       // past the grace period: moved to Starter
  | 'none'         // no subscription at all

export function billingState(input: {
  paidSubscription: SubscriptionLike | null
  trialActive: boolean
  trialEnded: boolean
  now?: Date
}): BillingState {
  const { paidSubscription: sub, trialActive, trialEnded, now = new Date() } = input
  if (sub && sub.status === 'active') {
    const days = daysUntil(sub.next_billing_date, now)
    if (days > DUE_SOON_DAYS) return 'active'
    if (days >= 0) return 'due_soon'
    if (days >= -GRACE_DAYS) return 'grace'
    return 'lapsed'
  }
  if (trialActive) return 'trial'
  if (trialEnded) return 'trial_ended'
  return 'none'
}

/** Share of the billing period already used, 0–100 */
export function periodProgress(sub: Pick<SubscriptionLike, 'billing_date' | 'next_billing_date'>, now: Date = new Date()): number {
  const start = parseDbTimestamp(sub.billing_date).getTime()
  const end = parseDbTimestamp(sub.next_billing_date).getTime()
  if (end <= start) return 100
  return Math.max(0, Math.min(100, Math.round(((now.getTime() - start) / (end - start)) * 100)))
}

export function planChangeKind(current: ClinicPlan | null, target: ClinicPlan): 'new' | 'renew' | 'upgrade' | 'downgrade' {
  if (!current) return 'new'
  if (current === target) return 'renew'
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current) ? 'upgrade' : 'downgrade'
}

export function subscriptionStatusLabel(sub: Pick<SubscriptionLike, 'status' | 'reference_number'>): { label: string; classes: string } {
  if (isTrialSubscription(sub)) return { label: 'Free trial', classes: 'bg-sky-100 text-sky-700' }
  switch (sub.status) {
    case 'active': return { label: 'Active', classes: 'bg-green-100 text-green-700' }
    case 'pending': return { label: 'Awaiting payment', classes: 'bg-yellow-100 text-yellow-700' }
    case 'cancelled': return { label: 'Replaced / cancelled', classes: 'bg-slate-100 text-slate-500' }
    case 'expired': return { label: 'Expired', classes: 'bg-red-100 text-red-700' }
    default: return { label: sub.status, classes: 'bg-slate-100 text-slate-500' }
  }
}
