import { describe, expect, it } from 'vitest'
import {
  addMonths, billingState, daysUntil, formatLimit, formatPeso, isTrialSubscription, parseDbTimestamp,
  periodProgress, planChangeKind, subscriptionStatusLabel, type SubscriptionLike,
} from './billing'
import { whiteTextIsHardToRead, contrastRatio, darken, isHexColor } from './branding'

const now = new Date('2026-10-10T00:00:00Z')
const sub = (nextBilling: string, over: Partial<SubscriptionLike> = {}): SubscriptionLike => ({
  plan: 'pro', status: 'active', reference_number: 'abc123',
  billing_date: '2026-09-10T00:00:00', next_billing_date: nextBilling, ...over,
})

describe('timestamps', () => {
  it('treats database timestamps (no zone) as UTC', () => {
    expect(parseDbTimestamp('2026-10-10T08:00:00').toISOString()).toBe('2026-10-10T08:00:00.000Z')
    expect(parseDbTimestamp('2026-10-10T08:00:00+08:00').toISOString()).toBe('2026-10-10T00:00:00.000Z')
    expect(parseDbTimestamp('2026-10-10T08:00:00Z').toISOString()).toBe('2026-10-10T08:00:00.000Z')
  })
  it('counts days until, rounding up and going negative when past', () => {
    expect(daysUntil('2026-10-13T00:00:00', now)).toBe(3)
    expect(daysUntil('2026-10-10T06:00:00', now)).toBe(1)
    expect(daysUntil('2026-10-07T00:00:00', now)).toBe(-3)
  })
})

describe('addMonths', () => {
  it('adds a month', () => {
    expect(addMonths(new Date('2026-10-14T00:00:00Z'), 1).toISOString()).toBe('2026-11-14T00:00:00.000Z')
  })
  it('clamps to the last day of a shorter month', () => {
    expect(addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })
  it('rolls over the year', () => {
    expect(addMonths(new Date('2026-12-15T00:00:00Z'), 1).toISOString()).toBe('2027-01-15T00:00:00.000Z')
  })
})

describe('billingState', () => {
  it('is "active" well before the end date', () => {
    expect(billingState({ paidSubscription: sub('2026-10-30T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('active')
  })
  it('is "due_soon" within a week of the end, including the last day', () => {
    expect(billingState({ paidSubscription: sub('2026-10-15T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('due_soon')
    expect(billingState({ paidSubscription: sub('2026-10-10T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('due_soon')
  })
  it('is "grace" for 3 days after the end, then "lapsed"', () => {
    expect(billingState({ paidSubscription: sub('2026-10-08T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('grace')
    expect(billingState({ paidSubscription: sub('2026-10-07T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('grace')
    expect(billingState({ paidSubscription: sub('2026-10-06T00:00:00'), trialActive: false, trialEnded: false, now })).toBe('lapsed')
  })
  it('reports the trial when there is no paid plan', () => {
    expect(billingState({ paidSubscription: null, trialActive: true, trialEnded: false, now })).toBe('trial')
    expect(billingState({ paidSubscription: null, trialActive: false, trialEnded: true, now })).toBe('trial_ended')
    expect(billingState({ paidSubscription: null, trialActive: false, trialEnded: false, now })).toBe('none')
  })
  it('ignores a subscription that is not active', () => {
    expect(billingState({ paidSubscription: sub('2026-10-30T00:00:00', { status: 'pending' }), trialActive: false, trialEnded: true, now })).toBe('trial_ended')
  })
})

describe('plans and labels', () => {
  it('describes a plan change', () => {
    expect(planChangeKind(null, 'pro')).toBe('new')
    expect(planChangeKind('pro', 'pro')).toBe('renew')
    expect(planChangeKind('pro', 'premium')).toBe('upgrade')
    expect(planChangeKind('premium', 'starter')).toBe('downgrade')
  })
  it('recognises the signup trial row', () => {
    expect(isTrialSubscription({ reference_number: 'TRIAL-abc' })).toBe(true)
    expect(isTrialSubscription({ reference_number: 'a1b2c3' })).toBe(false)
    expect(isTrialSubscription(null)).toBe(false)
  })
  it('uses friendly status labels', () => {
    expect(subscriptionStatusLabel({ status: 'pending', reference_number: 'x' }).label).toBe('Awaiting payment')
    expect(subscriptionStatusLabel({ status: 'active', reference_number: 'TRIAL-x' }).label).toBe('Free trial')
    expect(subscriptionStatusLabel({ status: 'expired', reference_number: 'x' }).label).toBe('Expired')
  })
  it('shows big limits as Unlimited', () => {
    expect(formatLimit(100)).toBe('100')
    expect(formatLimit(999999)).toBe('Unlimited')
  })
  it('formats centavos as pesos', () => {
    expect(formatPeso(89900)).toBe('₱899.00')
    expect(formatPeso(199900)).toBe('₱1,999.00')
  })
})

describe('periodProgress', () => {
  it('is how much of the period has passed', () => {
    const s = sub('2026-10-20T00:00:00', { billing_date: '2026-10-10T00:00:00' })
    expect(periodProgress(s, new Date('2026-10-15T00:00:00Z'))).toBe(50)
    expect(periodProgress(s, new Date('2026-12-01T00:00:00Z'))).toBe(100)
    expect(periodProgress(s, new Date('2026-09-01T00:00:00Z'))).toBe(0)
  })
})

describe('branding colors', () => {
  it('validates hex colors', () => {
    expect(isHexColor('#0ea5e9')).toBe(true)
    expect(isHexColor('0ea5e9')).toBe(false)
    expect(isHexColor('#fff')).toBe(false)
  })
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
  it('warns only when white text would be hard to read', () => {
    expect(whiteTextIsHardToRead('#fde047')).toBe(true)   // yellow
    expect(whiteTextIsHardToRead('#f59e0b')).toBe(true)   // amber
    expect(whiteTextIsHardToRead('#0ea5e9')).toBe(false)  // the default sky blue
    expect(whiteTextIsHardToRead('#1e40af')).toBe(false)
    expect(whiteTextIsHardToRead('not a color')).toBe(false)
  })
  it('darkens a color', () => {
    expect(darken('#ff8040', 0.5)).toBe('#804020')
  })
})
