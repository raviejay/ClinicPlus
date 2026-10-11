import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  state: null as any,
  getActiveSubscription: vi.fn(),
  getClinicSubscriptions: vi.fn(),
  createPaymentLink: vi.fn(),
  checkPatientLimit: vi.fn(),
  checkStaffLimit: vi.fn(),
  routeQuery: {} as Record<string, string>,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.routeQuery }),
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ loadClinic: vi.fn() }) }))
vi.mock('@/composables/useClinic', async () => {
  const { ref } = await import('vue')
  mocks.state = {
    clinic: ref<any>(null), isTrialActive: ref(false), trialDaysLeft: ref(0), trialExpired: ref(false),
  }
  return { useClinic: () => mocks.state }
})
vi.mock('@/services/subscription.service', () => ({
  subscriptionService: {
    getActiveSubscription: mocks.getActiveSubscription,
    getClinicSubscriptions: mocks.getClinicSubscriptions,
  },
}))
vi.mock('@/services/paymongoSubscription.service', () => ({
  paymongoSubscriptionService: { createPaymentLink: mocks.createPaymentLink },
}))
vi.mock('@/services/planRestriction.service', () => ({
  planRestrictionService: { checkPatientLimit: mocks.checkPatientLimit, checkStaffLimit: mocks.checkStaffLimit },
}))

import BillingPage from './BillingPage.vue'

const DAY = 86_400_000
// Database timestamps have no zone marker
const dbTime = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().replace('Z', '')

const paid = (plan: string, endsInDays: number, over: Record<string, unknown> = {}) => ({
  id: 'sub-paid', clinic_id: 'clinic-1', plan, status: 'active', payment_link_id: 'l', reference_number: 'REF123',
  amount: ({ starter: 59900, pro: 89900, premium: 199900 } as Record<string, number>)[plan],
  billing_date: dbTime(endsInDays - 30), next_billing_date: dbTime(endsInDays),
  created_at: dbTime(endsInDays - 30), updated_at: dbTime(endsInDays - 30), ...over,
})

const trialSub = {
  id: 'sub-trial', clinic_id: 'clinic-1', plan: 'premium', status: 'active', payment_link_id: 'trial', reference_number: 'TRIAL-clinic-1',
  amount: 199900, billing_date: dbTime(-9), next_billing_date: dbTime(5), created_at: dbTime(-9), updated_at: dbTime(-9),
}

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(BillingPage)
  await flushPromises()
}
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))
const usageOf = (current: number, max: number) => ({ data: { allowed: current < max, remaining: max - current, max, current, planName: 'x' }, error: null })

beforeEach(() => {
  mocks.routeQuery = {}
  mocks.state.clinic.value = { id: 'clinic-1', name: 'Demo', plan: 'starter', is_trial: false, trial_ends_at: null }
  mocks.state.isTrialActive.value = false
  mocks.state.trialDaysLeft.value = 0
  mocks.state.trialExpired.value = false
  mocks.getActiveSubscription.mockResolvedValue({ data: null, error: null })
  mocks.getClinicSubscriptions.mockResolvedValue({ data: [], error: null })
  mocks.createPaymentLink.mockResolvedValue({ data: { checkout_url: 'https://pay.example/x', reference_number: 'r', id: 'i' }, error: null })
  mocks.checkPatientLimit.mockResolvedValue(usageOf(10, 1000))
  mocks.checkStaffLimit.mockResolvedValue(usageOf(2, 5))
})

afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('billing page: trial', () => {
  beforeEach(() => {
    mocks.state.isTrialActive.value = true
    mocks.state.trialDaysLeft.value = 5
    mocks.state.clinic.value = { ...mocks.state.clinic.value, is_trial: true, trial_ends_at: dbTime(5) }
    mocks.getActiveSubscription.mockResolvedValue({ data: trialSub, error: null })
  })

  it('shows the trial days left instead of presenting the trial row as a paid Premium plan', async () => {
    await mountPage()
    expect(wrapper.text()).toContain('5 days left in your free trial')
    expect(wrapper.text()).toContain('Free Trial')
    expect(wrapper.text()).not.toContain('Renew')
    expect(wrapper.text()).toContain('Choose Pro')
  })

  it('reports usage against Premium limits during the trial', async () => {
    await mountPage()
    expect(mocks.checkPatientLimit).toHaveBeenCalledWith('clinic-1', 'premium')
    expect(wrapper.text()).toContain('trial (Premium)')
  })
})

describe('billing page: trial ended', () => {
  it('explains the read-only state', async () => {
    mocks.state.trialExpired.value = true
    mocks.state.clinic.value = { ...mocks.state.clinic.value, is_trial: true, trial_ends_at: dbTime(-2) }
    mocks.routeQuery = { readonly: '1' }
    await mountPage()
    expect(wrapper.text()).toContain('Your free trial has ended')
    expect(wrapper.text()).toContain('adding patients, appointments and records is paused')
  })
})

describe('billing page: paid plan', () => {
  it('shows the plan, end date and a renew button, with no warning banner', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', 20), error: null })
    await mountPage()
    expect(wrapper.text()).toContain('Pro')
    expect(wrapper.text()).toContain('Renew Pro · ₱899.00')
    expect(wrapper.text()).toContain('We never charge you automatically')
    expect(wrapper.text()).not.toContain('plan ends in')
    expect(wrapper.text()).toContain('Current plan')
  })

  it('labels the other plans as upgrade or switch', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', 20), error: null })
    await mountPage()
    expect(button('Upgrade to Premium')).toBeDefined()
    expect(button('Switch to Starter')).toBeDefined()
  })

  it('warns a few days before the plan ends', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', 3), error: null })
    await mountPage()
    expect(wrapper.text()).toContain('Your Pro plan ends in 3 days')
    expect(button('Renew now')).toBeDefined()
  })

  it('warns after the end date and counts down the grace period', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', -1), error: null })
    await mountPage()
    expect(wrapper.text()).toContain('Your Pro plan has ended')
    expect(wrapper.text()).toContain('Renew within 2 days')
  })

  it('says when the clinic has been moved down after the grace period', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', -10), error: null })
    await mountPage()
    expect(wrapper.text()).toContain('Your plan has lapsed')
  })
})

describe('billing page: confirming a payment', () => {
  it('explains that renewing early keeps the remaining days', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', 4), error: null })
    await mountPage()
    await button('Renew now')!.trigger('click')
    expect(wrapper.text()).toContain('Renew Pro?')
    expect(wrapper.text()).toContain('Your 4 remaining days are kept')
    expect(wrapper.text()).toContain('₱899')
  })

  it('warns that switching plans drops the remaining days', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('pro', 12), error: null })
    await mountPage()
    await button('Upgrade to Premium')!.trigger('click')
    expect(wrapper.text()).toContain('Upgrade to Premium?')
    expect(wrapper.text()).toContain("12 days left on it aren't carried over")
  })

  it('starts checkout for the chosen plan only after confirming', async () => {
    // jsdom can't navigate; replace location so we can observe the redirect
    const original = window.location
    Object.defineProperty(window, 'location', { value: { ...original, origin: 'https://app.test', href: '' }, writable: true })
    try {
      await mountPage()
      await button('Choose Pro')!.trigger('click')
      expect(mocks.createPaymentLink).not.toHaveBeenCalled()

      await button('Continue to payment')!.trigger('click')
      await flushPromises()
      expect(mocks.createPaymentLink).toHaveBeenCalledWith('pro', 'https://app.test')
      expect(window.location.href).toBe('https://pay.example/x')
    } finally {
      Object.defineProperty(window, 'location', { value: original, writable: true })
    }
  })

  it('shows why a payment could not be started', async () => {
    mocks.createPaymentLink.mockResolvedValue({ data: null, error: 'Redirect URL not allowed' })
    await mountPage()
    await button('Choose Pro')!.trigger('click')
    await button('Continue to payment')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain("Payment didn't go through")
    expect(wrapper.text()).toContain('Redirect URL not allowed')
  })
})

describe('billing page: usage and history', () => {
  it('shows usage meters and flags a clinic close to its limit', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('starter', 20), error: null })
    mocks.checkPatientLimit.mockResolvedValue(usageOf(85, 100))
    mocks.checkStaffLimit.mockResolvedValue(usageOf(1, 1))
    await mountPage()
    expect(wrapper.text()).toContain('New patients this month')
    expect(wrapper.text()).toContain('85 / 100')
    expect(wrapper.text()).toContain('Close to a limit')
  })

  it('shows unlimited limits as Unlimited', async () => {
    mocks.getActiveSubscription.mockResolvedValue({ data: paid('premium', 20), error: null })
    mocks.checkPatientLimit.mockResolvedValue(usageOf(500, 999999))
    await mountPage()
    expect(wrapper.text()).toContain('500 / Unlimited')
  })

  it('uses friendly status labels in the payment history', async () => {
    mocks.getClinicSubscriptions.mockResolvedValue({
      data: [
        paid('pro', 20, { id: 'a' }),
        paid('premium', 20, { id: 'b', status: 'pending', reference_number: 'REFPEND' }),
        { ...trialSub, id: 'c', status: 'expired' },
      ],
      error: null,
    })
    await mountPage()
    expect(wrapper.text()).toContain('Awaiting payment')
    expect(wrapper.text()).toContain('Free trial')
    expect(wrapper.text()).toContain('REFPEND')
  })
})

describe('billing page: after paying', () => {
  it('waits for the new subscription (not the old active one) before celebrating', async () => {
    vi.useFakeTimers()
    try {
      mocks.routeQuery = { status: 'success' }
      sessionStorage.setItem('billing:previous-subscription', 'sub-old')
      const old = paid('pro', 2, { id: 'sub-old' })
      const fresh = paid('pro', 32, { id: 'sub-new' })
      mocks.getActiveSubscription
        .mockResolvedValueOnce({ data: old, error: null })   // initial load
        .mockResolvedValueOnce({ data: old, error: null })   // first poll: webhook hasn't run yet
        .mockResolvedValue({ data: fresh, error: null })     // then it has

      wrapper = mount(BillingPage)
      await vi.advanceTimersByTimeAsync(0)
      expect(wrapper.text()).toContain('Activating your plan')
      expect(wrapper.text()).not.toContain('Payment successful')

      await vi.advanceTimersByTimeAsync(2100)
      expect(wrapper.text()).not.toContain('Payment successful')
      await vi.advanceTimersByTimeAsync(2100)
      await flushPromises()
      expect(wrapper.text()).toContain('Payment successful')
      expect(sessionStorage.getItem('billing:previous-subscription')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
