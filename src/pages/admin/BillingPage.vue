<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">Billing &amp; Subscription</h1>
        <p class="text-sm text-slate-500 mt-0.5">Your plan, usage and payment history</p>
      </div>

      <!-- Activating -->
      <div v-if="isActivating" role="status" class="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-center gap-4">
        <span class="material-icons text-sky-500 text-[26px] animate-spin">autorenew</span>
        <div>
          <p class="font-bold text-sky-800">Activating your plan…</p>
          <p class="text-sm text-sky-600">Payment received. This usually takes a few seconds.</p>
        </div>
      </div>

      <!-- Status banner -->
      <div v-else-if="banner" :role="banner.tone === 'danger' ? 'alert' : 'status'"
        class="rounded-2xl border p-5 flex items-start gap-4" :class="bannerClasses[banner.tone]">
        <span class="material-icons text-[24px] mt-0.5 shrink-0">{{ banner.icon }}</span>
        <div class="flex-1 min-w-0">
          <p class="font-bold">{{ banner.title }}</p>
          <p class="text-sm mt-0.5 opacity-90">{{ banner.text }}</p>
        </div>
        <button v-if="banner.action" type="button" @click="banner.action.run()" :disabled="isLoading || isLoadingData"
          class="shrink-0 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          {{ banner.action.label }}
        </button>
      </div>

      <!-- Current plan: loading -->
      <div v-if="isLoadingData" class="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse" aria-busy="true">
        <div class="grid md:grid-cols-2 gap-6">
          <div class="space-y-3"><div class="h-3 w-24 bg-slate-200 rounded-full"></div><div class="h-8 w-40 bg-slate-200 rounded-full"></div><div class="h-4 w-48 bg-slate-200 rounded-full"></div></div>
          <div class="bg-slate-50 rounded-xl p-5 border border-gray-200 space-y-3"><div class="h-3 w-24 bg-slate-200 rounded-full"></div><div class="h-9 w-32 bg-slate-200 rounded-full"></div><div class="h-11 w-full bg-slate-200 rounded-xl"></div></div>
        </div>
      </div>

      <!-- Current plan: paid -->
      <section v-else-if="paidSub" class="bg-white border border-gray-200 rounded-2xl p-6">
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <p class="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">Current plan</p>
            <div class="flex items-center gap-3 mb-4">
              <h2 class="text-3xl font-black text-slate-900">{{ currentPlanName }}</h2>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold" :class="statusChip.classes">{{ statusChip.label }}</span>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{{ formatDate(paidSub.billing_date) }}</span>
              <span class="font-semibold" :class="state === 'active' ? 'text-slate-700' : state === 'due_soon' ? 'text-amber-600' : 'text-red-600'">
                {{ periodLabel }}
              </span>
              <span>{{ formatDate(paidSub.next_billing_date) }}</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" aria-label="Billing period">
              <div class="h-full rounded-full transition-all"
                :class="state === 'active' ? 'bg-sky-500' : state === 'due_soon' ? 'bg-amber-500' : 'bg-red-500'"
                :style="{ width: progress + '%' }"></div>
            </div>
            <p class="text-xs text-slate-400 mt-3">
              Your plan runs until <span class="font-semibold text-slate-600">{{ formatDate(paidSub.next_billing_date) }}</span>.
              Renew before then to keep everything running.
            </p>
          </div>

          <div class="bg-slate-50 rounded-xl p-5 border border-gray-200">
            <p class="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">Price per month</p>
            <div class="text-4xl font-black text-slate-900 mb-1">{{ formatPeso(paidSub.amount) }}</div>
            <p class="text-xs text-slate-500 mb-4">Paid once each month. We never charge you automatically.</p>
            <button type="button" @click="startRenewal" :disabled="isLoading || isActivating"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors">
              {{ renewButtonLabel }}
            </button>
            <p class="text-[11px] text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
              <span class="material-icons text-[14px]">lock</span>
              Secure checkout · GCash, Maya, cards, QR Ph
            </p>
          </div>
        </div>
      </section>

      <!-- Current plan: trial / none -->
      <section v-else class="bg-white border border-gray-200 rounded-2xl p-6">
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <p class="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">Current plan</p>
            <div class="flex items-center gap-3 mb-4">
              <h2 class="text-3xl font-black text-slate-900">{{ state === 'trial' ? 'Free Trial' : state === 'trial_ended' ? 'Trial ended' : 'No active plan' }}</h2>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold"
                :class="state === 'trial' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'">
                {{ state === 'trial' ? 'TRIAL' : state === 'trial_ended' ? 'READ-ONLY' : 'LIMITED' }}
              </span>
            </div>

            <template v-if="state === 'trial' && clinic?.trial_ends_at">
              <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Trial started</span>
                <span class="font-semibold text-slate-700">{{ trialDaysLeft }} day{{ trialDaysLeft === 1 ? '' : 's' }} left</span>
                <span>Ends {{ formatDate(clinic.trial_ends_at) }}</span>
              </div>
              <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" :aria-valuenow="trialProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Trial progress">
                <div class="h-full rounded-full bg-sky-500 transition-all" :style="{ width: trialProgress + '%' }"></div>
              </div>
              <p class="text-xs text-slate-400 mt-3">You have full Premium access during the trial.</p>
            </template>
            <p v-else-if="state === 'trial_ended'" class="text-sm text-slate-500">
              Your data is safe and you can still view it. Choose a plan to add patients, appointments and records again.
            </p>
            <p v-else class="text-sm text-slate-500">Choose a plan below to unlock all of ClinicGo's features.</p>
          </div>

          <div class="bg-slate-50 rounded-xl p-5 border border-gray-200 flex flex-col justify-center">
            <p class="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">Price</p>
            <div class="text-4xl font-black text-slate-900 mb-1">₱0.00</div>
            <p class="text-xs text-slate-500 mb-4">{{ state === 'trial' ? 'Free until your trial ends.' : 'Pick a plan to continue.' }}</p>
            <a href="#plans" class="w-full bg-sky-50 border border-sky-200 text-sky-700 font-bold py-3 rounded-xl text-center text-sm hover:bg-sky-100 transition-colors">
              Compare plans ↓
            </a>
          </div>
        </div>
      </section>

      <!-- Usage -->
      <section v-if="usage.patients || usage.staff" class="bg-white border border-gray-200 rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-900">Usage on your {{ limitsPlanName }} plan</h3>
          <span v-if="nearLimit" class="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Close to a limit</span>
        </div>
        <div class="grid sm:grid-cols-2 gap-5">
          <div v-for="meter in meters" :key="meter.label">
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="font-semibold text-slate-700">{{ meter.label }}</span>
              <span class="text-slate-500">
                {{ meter.current.toLocaleString('en-PH') }} / {{ formatLimit(meter.max) }}
              </span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar"
              :aria-valuenow="meter.pct" aria-valuemin="0" aria-valuemax="100" :aria-label="meter.label">
              <div class="h-full rounded-full transition-all"
                :class="meter.pct >= 100 ? 'bg-red-500' : meter.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                :style="{ width: Math.max(meter.max >= UNLIMITED ? 4 : meter.pct, 2) + '%' }"></div>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">{{ meter.hint }}</p>
          </div>
        </div>
      </section>

      <!-- Plans -->
      <section id="plans" class="scroll-mt-4">
        <h3 class="text-lg font-black text-slate-900 mb-3">Plans</h3>
        <div class="grid md:grid-cols-3 gap-4">
          <div v-for="plan in availablePlans" :key="plan.id"
            :class="['relative bg-white border rounded-2xl p-5 flex flex-col transition-all',
              isCurrentPlan(plan.id) ? 'border-sky-500 border-2 shadow-lg bg-sky-50/40' : 'border-gray-200']">
            <span v-if="plan.popular && !isCurrentPlan(plan.id)"
              class="absolute -top-2.5 left-5 text-[10px] font-bold bg-violet-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">Most popular</span>
            <span v-if="isCurrentPlan(plan.id)"
              class="absolute -top-2.5 left-5 text-[10px] font-bold bg-sky-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">Your plan</span>

            <h4 class="font-black text-slate-900 text-lg">{{ plan.name }}</h4>
            <p class="text-xs text-slate-400 mb-3">{{ plan.tagline }}</p>
            <div class="text-3xl font-black text-slate-900 mb-4">
              {{ formatPesoWhole(plan.price) }}<span class="text-sm font-normal text-slate-500"> /month</span>
            </div>

            <ul class="space-y-2 text-sm text-slate-700 mb-3">
              <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
                <span class="material-icons text-green-500 text-[16px] mt-0.5">check</span>{{ feature }}
              </li>
            </ul>
            <ul v-if="plan.limits.length" class="space-y-2 text-sm text-slate-400 mb-4">
              <li v-for="limit in plan.limits" :key="limit" class="flex items-start gap-2">
                <span class="material-icons text-slate-300 text-[16px] mt-0.5">lock</span>{{ limit }}
              </li>
            </ul>

            <div class="mt-auto pt-2">
              <div v-if="isCurrentPlan(plan.id)" class="text-center text-sm font-bold text-sky-600 py-2.5">Current plan</div>
              <button v-else type="button" @click="confirmUpgrade(plan)"
                :disabled="isLoading || isActivating || isLoadingData"
                :class="['w-full font-bold py-2.5 rounded-xl transition-colors text-sm disabled:bg-slate-300 disabled:text-white',
                  plan.popular ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white']">
                {{ isLoading && lastAttemptedPlan === plan.id ? 'Processing…' : planButtonLabel(plan) }}
              </button>
            </div>
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-3 text-center">
          Prices are per month in Philippine pesos. You pay once for each month — nothing is charged automatically.
        </p>
      </section>

      <!-- History -->
      <section v-if="subscriptionHistory.length > 0" class="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 class="text-lg font-black text-slate-900 mb-4">Payment history</h3>
        <div class="overflow-x-auto -mx-2 px-2">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200">
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400">
                <th class="font-bold pb-3 pr-4">Date</th>
                <th class="font-bold pb-3 pr-4">Plan</th>
                <th class="font-bold pb-3 pr-4">Amount</th>
                <th class="font-bold pb-3 pr-4">Status</th>
                <th class="font-bold pb-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in subscriptionHistory" :key="sub.id" class="border-b border-gray-100 last:border-0">
                <td class="py-3 pr-4 text-slate-600 whitespace-nowrap">{{ formatDate(sub.created_at) }}</td>
                <td class="py-3 pr-4 font-semibold text-slate-900">{{ capitalize(sub.plan) }}</td>
                <td class="py-3 pr-4 text-slate-900 whitespace-nowrap">{{ isTrialSubscription(sub) ? '—' : formatPeso(sub.amount) }}</td>
                <td class="py-3 pr-4">
                  <span class="px-2 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" :class="subscriptionStatusLabel(sub).classes">
                    {{ subscriptionStatusLabel(sub).label }}
                  </span>
                </td>
                <td class="py-3 text-slate-400 font-mono text-xs">{{ isTrialSubscription(sub) ? '—' : sub.reference_number }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p v-if="supportEmail" class="text-center text-xs text-slate-400 pb-4">
        Questions about billing?
        <a :href="`mailto:${supportEmail}?subject=Billing question`" class="text-sky-500 font-semibold">{{ supportEmail }}</a>
      </p>
    </div>

    <!-- Confirm modal -->
    <Transition name="modal">
      <div v-if="showConfirmModal && pendingPlan"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"
        @click.self="!isLoading && (showConfirmModal = false)">
        <div class="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl">
          <div class="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-sky-500 text-[28px]">{{ pendingKind === 'renew' ? 'autorenew' : pendingKind === 'downgrade' ? 'swap_vert' : 'bolt' }}</span>
          </div>
          <h2 id="confirm-title" class="text-xl font-black text-slate-900 text-center mb-4">{{ confirmTitle }}</h2>

          <dl class="bg-slate-50 border border-gray-200 rounded-xl divide-y divide-gray-200 text-sm mb-4">
            <div class="flex items-center justify-between px-4 py-2.5">
              <dt class="text-slate-500">Pay today</dt>
              <dd class="font-black text-slate-900">{{ formatPesoWhole(pendingPlan.price) }}</dd>
            </div>
            <div v-if="pendingEnd" class="flex items-center justify-between px-4 py-2.5">
              <dt class="text-slate-500">Active until</dt>
              <dd class="font-bold text-slate-800">{{ formatDate(pendingEnd) }}</dd>
            </div>
          </dl>

          <p v-if="pendingKind === 'renew' && paidSub && daysLeft > 0"
            class="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            Your {{ daysLeft }} remaining day{{ daysLeft === 1 ? '' : 's' }} are kept — this adds a month after your current end date.
          </p>
          <p v-else-if="daysLost > 0"
            class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            Your current <span class="font-bold">{{ currentPlanName }}</span> plan ends right away. The
            {{ daysLost }} day{{ daysLost === 1 ? '' : 's' }} left on it aren't carried over.
          </p>

          <p class="text-[11px] text-slate-400 text-center mb-5">
            You'll pay on PayMongo with GCash, Maya, card or QR Ph. This is a one-time payment for the month.
          </p>

          <div class="flex gap-3">
            <button type="button" @click="showConfirmModal = false" :disabled="isLoading"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">Cancel</button>
            <button type="button" @click="proceedUpgrade" :disabled="isLoading"
              class="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors text-sm">
              {{ isLoading ? 'Opening checkout…' : 'Continue to payment' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Success modal -->
    <Transition name="modal">
      <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span class="material-icons text-green-500 text-4xl">check</span>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">Payment successful!</h2>
          <p class="text-slate-500 mb-1">
            Your <span class="font-bold text-slate-700">{{ activatedPlanName }}</span> plan is active<template v-if="activatedUntil"> until <span class="font-bold text-slate-700">{{ activatedUntil }}</span></template>.
          </p>
          <p class="text-xs text-slate-400 mb-7">Thank you for choosing ClinicGo.</p>
          <button type="button" @click="closeSuccessModal"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">Continue</button>
        </div>
      </div>
    </Transition>

    <!-- Failed modal -->
    <Transition name="modal">
      <div v-if="showFailedModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span class="material-icons text-red-500 text-4xl">close</span>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">Payment didn't go through</h2>
          <p class="text-slate-500 mb-2">{{ failedMessage || 'Your payment was cancelled or unsuccessful.' }}</p>
          <p class="text-xs text-slate-400 mb-6">You haven't been charged unless you completed the payment.</p>
          <div class="flex gap-3">
            <button type="button" @click="closeFailedModal"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Dismiss</button>
            <button type="button" @click="retryPayment"
              class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">Try again</button>
          </div>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import { subscriptionService } from '@/services/subscription.service'
import { paymongoSubscriptionService } from '@/services/paymongoSubscription.service'
import { planRestrictionService, type LimitCheck } from '@/services/planRestriction.service'
import {
  GRACE_DAYS, UNLIMITED, addMonths, billingState, daysUntil, formatDate, formatLimit, formatPeso, formatPesoWhole,
  isTrialSubscription, parseDbTimestamp, periodProgress, planChangeKind, subscriptionStatusLabel,
} from '@/utils/billing'
import type { Subscription, ClinicPlan } from '@/types'

const auth = useAuthStore()
const { clinic, isTrialActive, trialDaysLeft, trialExpired } = useClinic()
const route = useRoute()
const router = useRouter()
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined

// The checkout redirects back here; remember which subscription was active before paying
// so we can tell when the webhook has activated the new one.
const PREVIOUS_SUB_KEY = 'billing:previous-subscription'

interface PlanCard {
  id: ClinicPlan
  name: string
  tagline: string
  price: number
  popular?: boolean
  features: string[]
  limits: string[]
}

const availablePlans: PlanCard[] = [
  {
    id: 'starter', name: 'Starter', tagline: 'For a solo practice getting started', price: 599,
    features: [
      'Up to 100 new patients per month',
      'Admin account only',
      'Appointment booking',
      'Public booking page with live availability',
    ],
    limits: ['Queue management', 'Revenue tracking', 'Email notifications', 'Logo, colors & booking layouts', 'Full analytics', 'Priority support'],
  },
  {
    id: 'pro', name: 'Pro', tagline: 'For busy clinics with a small team', price: 899, popular: true,
    features: [
      'Up to 1,000 new patients per month',
      'Up to 5 staff accounts',
      'Public booking page with live availability',
      'Queue management',
      'Revenue tracking',
      'Email notifications to patients',
      'Logo, brand colors & booking layouts',
    ],
    limits: ['Custom-designed theme', 'Full analytics', 'Priority support', 'Multi-branch'],
  },
  {
    id: 'premium', name: 'Premium', tagline: 'For growing and multi-branch clinics', price: 1999,
    features: [
      'Unlimited new patients',
      'Unlimited staff accounts',
      'Up to 5 branches',
      'Everything in Pro',
      'Custom-designed booking theme by our team',
      'Full analytics',
      'Priority support',
    ],
    limits: [],
  },
]

const subscription = ref<Subscription | null>(null)
const subscriptionHistory = ref<Subscription[]>([])
const isLoading = ref(false)
const isActivating = ref(false)
const isLoadingData = ref(true)

const showSuccessModal = ref(false)
const showFailedModal = ref(false)
const showConfirmModal = ref(false)
const failedMessage = ref('')
const activatedPlanName = ref('')
const activatedUntil = ref('')
const lastAttemptedPlan = ref<ClinicPlan | null>(null)
const pendingPlan = ref<PlanCard | null>(null)

// ── Where the clinic is in its billing cycle ──
// The signup trial is stored as an "active Premium" row; it isn't a paid plan.
const paidSub = computed(() => (subscription.value && !isTrialSubscription(subscription.value) ? subscription.value : null))
const state = computed(() => billingState({
  paidSubscription: paidSub.value,
  trialActive: isTrialActive.value,
  trialEnded: !!trialExpired.value,
}))
const currentPlanId = computed<ClinicPlan | null>(() => paidSub.value?.plan ?? null)
const planNameOf = (id: ClinicPlan) => availablePlans.find(p => p.id === id)?.name ?? id
const currentPlanName = computed(() => (currentPlanId.value ? planNameOf(currentPlanId.value) : ''))
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const daysLeft = computed(() => (paidSub.value ? daysUntil(paidSub.value.next_billing_date) : 0))
const progress = computed(() => (paidSub.value ? periodProgress(paidSub.value) : 0))
const trialProgress = computed(() => {
  const end = clinic.value?.trial_ends_at
  if (!end) return 0
  const endMs = parseDbTimestamp(end).getTime()
  const startMs = endMs - 14 * 86_400_000
  return Math.max(0, Math.min(100, Math.round(((Date.now() - startMs) / (endMs - startMs)) * 100)))
})

const statusChip = computed(() => {
  switch (state.value) {
    case 'due_soon': return { label: 'ENDING SOON', classes: 'bg-amber-100 text-amber-700' }
    case 'grace': return { label: 'EXPIRED', classes: 'bg-red-100 text-red-700' }
    case 'lapsed': return { label: 'LAPSED', classes: 'bg-red-100 text-red-700' }
    default: return { label: 'ACTIVE', classes: 'bg-green-100 text-green-700' }
  }
})

const periodLabel = computed(() => {
  const d = daysLeft.value
  if (d > 0) return `${d} day${d === 1 ? '' : 's'} left`
  if (d === 0) return 'Ends today'
  return `Ended ${-d} day${d === -1 ? '' : 's'} ago`
})

const renewButtonLabel = computed(() => {
  if (isLoading.value && lastAttemptedPlan.value === currentPlanId.value) return 'Opening checkout…'
  return `Renew ${currentPlanName.value} · ${paidSub.value ? formatPeso(planPrice(paidSub.value.plan) * 100) : ''}`
})
const planPrice = (id: ClinicPlan) => availablePlans.find(p => p.id === id)?.price ?? 0

// ── Banner ──
type BannerTone = 'info' | 'warn' | 'danger'
const bannerClasses: Record<BannerTone, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
}

const banner = computed<null | {
  tone: BannerTone; icon: string; title: string; text: string; action?: { label: string; run: () => void }
}>(() => {
  switch (state.value) {
    case 'trial':
      return {
        tone: 'info', icon: 'hourglass_top',
        title: `${trialDaysLeft.value} day${trialDaysLeft.value === 1 ? '' : 's'} left in your free trial`,
        text: 'You have full Premium access. Choose a plan before it ends to keep adding patients and appointments.',
      }
    case 'trial_ended':
      return {
        tone: 'danger', icon: 'lock_clock',
        title: 'Your free trial has ended',
        text: 'Your data is safe and viewable, but adding patients, appointments and records is paused until you choose a plan.',
      }
    case 'due_soon':
      return {
        tone: 'warn', icon: 'event_upcoming',
        title: daysLeft.value === 0 ? `Your ${currentPlanName.value} plan ends today` : `Your ${currentPlanName.value} plan ends in ${daysLeft.value} day${daysLeft.value === 1 ? '' : 's'}`,
        text: 'Renew now to keep your features — the days you have left are added to your next month.',
        action: { label: 'Renew now', run: startRenewal },
      }
    case 'grace':
      return {
        tone: 'danger', icon: 'warning',
        title: `Your ${currentPlanName.value} plan has ended`,
        text: `Renew within ${Math.max(0, GRACE_DAYS + daysLeft.value)} day${GRACE_DAYS + daysLeft.value === 1 ? '' : 's'} to avoid being moved to the Starter plan.`,
        action: { label: 'Renew now', run: startRenewal },
      }
    case 'lapsed':
      return {
        tone: 'danger', icon: 'warning',
        title: 'Your plan has lapsed',
        text: 'Your clinic has been moved to the Starter plan. Renew or choose a plan to get your features back.',
        action: { label: 'Renew now', run: startRenewal },
      }
    default:
      return null
  }
})

// ── Usage ──
const usage = ref<{ patients: LimitCheck | null; staff: LimitCheck | null }>({ patients: null, staff: null })
const limitsPlan = computed<ClinicPlan>(() =>
  isTrialActive.value ? 'premium' : (paidSub.value?.plan ?? (clinic.value?.plan as ClinicPlan | undefined) ?? 'starter'))
const limitsPlanName = computed(() => (isTrialActive.value ? 'trial (Premium)' : planNameOf(limitsPlan.value)))

const meters = computed(() => {
  const out: { label: string; current: number; max: number; pct: number; hint: string }[] = []
  const pct = (c: number, m: number) => (m >= UNLIMITED ? 0 : m === 0 ? 100 : Math.min(100, Math.round((c / m) * 100)))
  if (usage.value.patients) {
    const { current, max } = usage.value.patients
    out.push({ label: 'New patients this month', current, max, pct: pct(current, max), hint: 'Resets on the 1st of every month' })
  }
  if (usage.value.staff) {
    const { current, max } = usage.value.staff
    out.push({ label: 'Staff accounts', current, max, pct: pct(current, max), hint: 'Admin, doctors and staff' })
  }
  return out
})
const nearLimit = computed(() => meters.value.some(m => m.pct >= 80))

async function loadUsage() {
  if (!clinic.value) return
  const [patients, staff] = await Promise.all([
    planRestrictionService.checkPatientLimit(clinic.value.id, limitsPlan.value),
    planRestrictionService.checkStaffLimit(clinic.value.id, limitsPlan.value),
  ])
  usage.value = { patients: patients.data, staff: staff.data }
}

// ── Plan buttons and the confirmation dialog ──
const isCurrentPlan = (id: ClinicPlan) =>
  !!paidSub.value && paidSub.value.plan === id && paidSub.value.status === 'active' && state.value !== 'lapsed'

const planButtonLabel = (plan: PlanCard) => {
  switch (planChangeKind(currentPlanId.value, plan.id)) {
    case 'upgrade': return `Upgrade to ${plan.name}`
    case 'downgrade': return `Switch to ${plan.name}`
    case 'renew': return `Renew ${plan.name}`
    default: return `Choose ${plan.name}`
  }
}

const pendingKind = computed(() => (pendingPlan.value ? planChangeKind(currentPlanId.value, pendingPlan.value.id) : 'new'))
const confirmTitle = computed(() => {
  const name = pendingPlan.value?.name ?? ''
  switch (pendingKind.value) {
    case 'renew': return `Renew ${name}?`
    case 'upgrade': return `Upgrade to ${name}?`
    case 'downgrade': return `Switch to ${name}?`
    default: return `Choose ${name}?`
  }
})
// Renewing the same plan before it ends adds a month after the current end date (the server does the same)
const pendingEnd = computed<Date | null>(() => {
  if (!pendingPlan.value) return null
  const end = paidSub.value ? parseDbTimestamp(paidSub.value.next_billing_date) : null
  const start = pendingKind.value === 'renew' && end && end > new Date() ? end : new Date()
  return addMonths(start, 1)
})
const daysLost = computed(() =>
  (pendingKind.value === 'upgrade' || pendingKind.value === 'downgrade') && paidSub.value && daysLeft.value > 0 ? daysLeft.value : 0)

function startRenewal() {
  const plan = availablePlans.find(p => p.id === currentPlanId.value)
  if (plan) confirmUpgrade(plan)
}

const confirmUpgrade = (plan: PlanCard) => {
  pendingPlan.value = plan
  showConfirmModal.value = true
}

const proceedUpgrade = () => {
  showConfirmModal.value = false
  if (pendingPlan.value) upgradePlan(pendingPlan.value.id)
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  router.replace({ query: {} })
}

const closeFailedModal = () => {
  showFailedModal.value = false
  failedMessage.value = ''
  router.replace({ query: {} })
}

const retryPayment = () => {
  closeFailedModal()
  const plan = availablePlans.find(p => p.id === lastAttemptedPlan.value)
  if (plan) confirmUpgrade(plan)
}

// ── Checkout ──
async function upgradePlan(newPlan: ClinicPlan) {
  if (!clinic.value) return
  isLoading.value = true
  lastAttemptedPlan.value = newPlan

  try {
    // The server picks the price, creates the pending subscription and returns the PayMongo checkout link
    const result = await paymongoSubscriptionService.createPaymentLink(newPlan, window.location.origin)

    if (result.error || !result.data) {
      failedMessage.value = result.error ?? ''
      showFailedModal.value = true
      return
    }

    try { sessionStorage.setItem(PREVIOUS_SUB_KEY, subscription.value?.id ?? '') } catch { /* private mode */ }
    window.location.href = result.data.checkout_url
  } catch {
    showFailedModal.value = true
  } finally {
    isLoading.value = false
  }
}

async function pollForActivation(maxAttempts = 15) {
  let previousId = ''
  try { previousId = sessionStorage.getItem(PREVIOUS_SUB_KEY) ?? '' } catch { /* ignore */ }

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))
    if (!clinic.value) break

    const { data } = await subscriptionService.getActiveSubscription(clinic.value.id)
    // A renewal keeps the old row "active" until the webhook swaps it, so wait for a different one
    if (data && data.status === 'active' && data.id !== previousId && !isTrialSubscription(data)) {
      await finishActivation(data)
      return
    }
  }

  // The webhook took longer than expected; the plan will appear as soon as it lands
  isActivating.value = false
  activatedPlanName.value = 'new'
  activatedUntil.value = ''
  showSuccessModal.value = true
  await loadData(true)
}

async function finishActivation(data: Subscription) {
  subscription.value = data
  activatedPlanName.value = planNameOf(data.plan)
  activatedUntil.value = formatDate(data.next_billing_date)
  try { sessionStorage.removeItem(PREVIOUS_SUB_KEY) } catch { /* ignore */ }

  const history = await subscriptionService.getClinicSubscriptions(clinic.value!.id)
  if (history.data) subscriptionHistory.value = history.data
  // Refresh the clinic so the sidebar, feature gates and limits pick up the new plan
  await auth.loadClinic(clinic.value!.id)
  loadUsage()

  isActivating.value = false
  showSuccessModal.value = true
}

async function loadData(quiet = false) {
  if (!clinic.value) return
  if (!quiet) isLoadingData.value = true

  const [active, history] = await Promise.all([
    subscriptionService.getActiveSubscription(clinic.value.id),
    subscriptionService.getClinicSubscriptions(clinic.value.id),
  ])
  if (active.data) subscription.value = active.data
  if (history.data) subscriptionHistory.value = history.data
  isLoadingData.value = false
  loadUsage()

  if (quiet) return
  const status = route.query.status
  if (status === 'success') {
    isActivating.value = true
    await pollForActivation()
  } else if (status === 'failed') {
    showFailedModal.value = true
  }
}

onMounted(() => {
  if (clinic.value) {
    loadData()
  } else {
    const stop = watch(clinic, (val) => {
      if (val) {
        loadData()
        stop()
      }
    })
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
