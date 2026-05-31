<template>
  <div class="max-w-4xl mx-auto px-6 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-black text-slate-900 mb-2">Billing & Subscription</h1>
      <p class="text-slate-500">Manage your subscription plan and billing information</p>
    </div>

    <!-- Activating Banner -->
    <div v-if="isActivating" class="bg-sky-50 border border-sky-200 rounded-2xl p-6 mb-8 flex items-center gap-4">
      <svg class="animate-spin h-6 w-6 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <div>
        <p class="font-bold text-sky-800">Activating your plan...</p>
        <p class="text-sm text-sky-600">Payment received. This usually takes a few seconds.</p>
      </div>
    </div>

    <!-- Current Plan Card — Loading Skeleton -->
    <div v-if="isLoadingData" class="bg-white border border-gray-200 rounded-2xl p-8 mb-8 animate-pulse">
      <div class="grid md:grid-cols-2 gap-8">
        <div class="space-y-4">
          <div class="h-3 w-24 bg-slate-200 rounded-full"></div>
          <div class="h-8 w-40 bg-slate-200 rounded-full"></div>
          <div class="h-4 w-32 bg-slate-200 rounded-full"></div>
          <div class="h-4 w-28 bg-slate-200 rounded-full"></div>
        </div>
        <div class="bg-slate-50 rounded-xl p-6 border border-gray-200 space-y-4">
          <div class="h-3 w-24 bg-slate-200 rounded-full"></div>
          <div class="h-10 w-36 bg-slate-200 rounded-full"></div>
          <div class="h-4 w-28 bg-slate-200 rounded-full"></div>
          <div class="h-12 w-full bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- Current Plan Card — Active Subscription -->
    <div v-else-if="subscription" class="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Current Plan</p>
          <h2 class="text-3xl font-black text-slate-900 mb-4">{{ planName }}</h2>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-600">Status:</span>
              <span :class="[
                'px-3 py-1 rounded-full text-xs font-bold',
                subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              ]">
                {{ subscription.status.toUpperCase() }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-600">Billing Date:</span>
              <span class="text-sm text-slate-700">{{ formatDate(subscription.billing_date) }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-600">Next Billing:</span>
              <span class="text-sm text-slate-700">{{ formatDate(subscription.next_billing_date) }}</span>
            </div>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-6 border border-gray-200">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Monthly Cost</p>
          <div class="text-4xl font-black text-slate-900 mb-1">
            ₱{{ (subscription.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <p class="text-sm text-slate-500 mb-6">Due on {{ dayOfMonth(subscription.next_billing_date) }}</p>
          <button @click="loadPaymentCheckout"
            :disabled="isLoading"
            class="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors">
            {{ isLoading ? 'Loading...' : 'Update Payment Method' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Current Plan Card — Trial -->
    <div v-else class="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Current Plan</p>
          <h2 class="text-3xl font-black text-slate-900 mb-4">Free Trial</h2>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-600">Status:</span>
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                TRIAL
              </span>
            </div>
            <p class="text-sm text-slate-500">
              You're currently on the free trial. Upgrade to a plan below to unlock full access.
            </p>
          </div>
        </div>
        <div class="bg-slate-50 rounded-xl p-6 border border-gray-200 flex flex-col justify-center">
          <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Monthly Cost</p>
          <div class="text-4xl font-black text-slate-900 mb-1">₱0.00</div>
          <p class="text-sm text-slate-500 mb-6">Upgrade anytime to get full access.</p>
          <div class="w-full bg-sky-50 border border-sky-200 text-sky-700 font-bold py-3 rounded-xl text-center text-sm">
            Choose a plan below ↓
          </div>
        </div>
      </div>
    </div>

    <!-- Plan Comparison -->
    <div class="mb-8">
      <h3 class="text-xl font-black text-slate-900 mb-4">Available Plans</h3>
      <div class="grid md:grid-cols-3 gap-4">
        <div v-for="plan in availablePlans" :key="plan.name"
          :class="[
            'bg-white border rounded-2xl p-6 transition-all',
            isCurrentPlan(plan.id) ? 'border-sky-500 border-2 shadow-lg bg-sky-50' : 'border-gray-200'
          ]">
          <h4 class="font-black text-slate-900 text-lg mb-2">{{ plan.name }}</h4>
          <div class="text-2xl font-black text-slate-900 mb-4">
            ₱{{ plan.price.toLocaleString('en-US') }}
            <span class="text-sm font-normal text-slate-500">/month</span>
          </div>
          <ul :class="['space-y-2 text-sm text-slate-700', plan.limits.length ? 'mb-4' : 'mb-6']">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
              <span class="text-green-500 font-bold mt-0.5">✓</span> {{ feature }}
            </li>
          </ul>
          <ul v-if="plan.limits.length" class="space-y-2 text-sm text-slate-400 mb-6">
            <li v-for="limit in plan.limits" :key="limit" class="flex items-start gap-2">
              <span class="text-slate-300 font-bold mt-0.5">🔒</span> {{ limit }}
            </li>
          </ul>

          <!-- Current active plan -->
          <div v-if="isCurrentPlan(plan.id)"
            class="text-center text-sm font-bold text-sky-600 py-2">
            Current Plan
          </div>

          <!-- Upgrade / Switch button -->
          <button v-else
            @click="confirmUpgrade(plan)"
            :disabled="isLoading || isActivating || isLoadingData"
            class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-2 rounded-lg transition-colors text-sm">
            {{ isLoading && lastAttemptedPlan === plan.id ? 'Processing...' : getPlanButtonLabel(plan.id) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Subscription History -->
    <div v-if="subscriptionHistory.length > 0" class="bg-white border border-gray-200 rounded-2xl p-8">
      <h3 class="text-xl font-black text-slate-900 mb-4">Subscription History</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200">
            <tr>
              <th class="text-left font-bold text-slate-900 pb-3">Date</th>
              <th class="text-left font-bold text-slate-900 pb-3">Plan</th>
              <th class="text-left font-bold text-slate-900 pb-3">Amount</th>
              <th class="text-left font-bold text-slate-900 pb-3">Status</th>
              <th class="text-left font-bold text-slate-900 pb-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subscriptionHistory" :key="sub.id" class="border-b border-gray-100">
              <td class="py-3 text-slate-600">{{ formatDate(sub.created_at) }}</td>
              <td class="py-3 font-semibold text-slate-900">{{ capitalizePlan(sub.plan) }}</td>
              <td class="py-3 text-slate-900">₱{{ (sub.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
              <td class="py-3">
                <span :class="[
                  'px-2 py-1 rounded text-xs font-bold',
                  sub.status === 'active' ? 'bg-green-100 text-green-700' :
                  sub.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                ]">
                  {{ sub.status.toUpperCase() }}
                </span>
              </td>
              <td class="py-3 text-slate-500 font-mono text-xs">{{ sub.reference_number }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Upgrade Confirmation Modal -->
    <Transition name="modal">
      <div v-if="showConfirmModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div class="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">
            {{ subscription ? getPlanButtonLabel(pendingPlan!.id) + ' to ' + pendingPlan?.name + '?' : 'Upgrade to ' + pendingPlan?.name + '?' }}
          </h2>
          <p class="text-slate-500 mb-2">
            You'll be charged
            <span class="font-bold text-slate-700">₱{{ pendingPlan?.price.toLocaleString('en-US') }}/month</span>.
          </p>
          <p v-if="subscription" class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            ⚠️ Your current <span class="font-bold">{{ planName }}</span> plan will be cancelled immediately and a new 30-day billing cycle starts today.
          </p>
          <p v-else class="text-xs text-slate-400 mb-6">
            A new 30-day billing cycle starts today.
          </p>
          <div class="flex gap-3">
            <button @click="showConfirmModal = false"
              :disabled="isLoading"
              class="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors">
              Cancel
            </button>
            <button @click="proceedUpgrade"
              :disabled="isLoading"
              class="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors">
              {{ isLoading ? 'Processing...' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ✅ Success Modal -->
    <Transition name="modal">
      <div v-if="showSuccessModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h2>
          <p class="text-slate-500 mb-2">
            Your <span class="font-bold text-slate-700">{{ activatedPlanName }}</span> plan is now active.
          </p>
          <p class="text-xs text-slate-400 mb-8">Thank you for subscribing to ClinicGo.</p>
          <button @click="closeSuccessModal"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
            Continue
          </button>
        </div>
      </div>
    </Transition>

    <!-- ❌ Failed Modal -->
    <Transition name="modal">
      <div v-if="showFailedModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2">Payment Failed</h2>
          <p class="text-slate-500 mb-8">Your payment was cancelled or unsuccessful. Please try again.</p>
          <div class="flex gap-3">
            <button @click="closeFailedModal"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
              Dismiss
            </button>
            <button @click="retryPayment"
              class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClinic } from '@/composables/useClinic'
import { subscriptionService } from '@/services/subscription.service'
import { paymongoSubscriptionService } from '@/services/paymongoSubscription.service'
import type { Subscription, ClinicPlan } from '@/types'

const { clinic } = useClinic()
const route = useRoute()
const router = useRouter()

const subscription = ref<Subscription | null>(null)
const subscriptionHistory = ref<Subscription[]>([])
const isLoading = ref(false)
const isActivating = ref(false)
const isLoadingData = ref(true)

// Modal state
const showSuccessModal = ref(false)
const showFailedModal = ref(false)
const showConfirmModal = ref(false)
const activatedPlanName = ref('')
const lastAttemptedPlan = ref<ClinicPlan | null>(null)
const pendingPlan = ref<typeof availablePlans[0] | null>(null)

const availablePlans = [
  {
    id: 'starter' as ClinicPlan,
    name: 'Starter',
    price: 599,
    features: [
      'Up to 100 new patients per month (resets every month)',
      'Admin account only',
      'Appointment booking',
      'Public booking page',
    ],
    limits: [
      'Queue management',
      'Revenue tracking',
      'Email notifications',
      'Full analytics',
      'Custom branding',
      'Priority support',
    ],
  },
  {
    id: 'pro' as ClinicPlan,
    name: 'Pro',
    price: 899,
    features: [
      'Up to 1,000 new patients per month (resets every month)',
      'Up to 5 staff accounts',
      'Appointment booking',
      'Public booking page',
      'Queue management',
      'Revenue tracking',
      'Email notifications to patients',
    ],
    limits: [
      'Full analytics',
      'Custom branding',
      'Priority support',
      'Multi-branch',
    ],
  },
  {
    id: 'premium' as ClinicPlan,
    name: 'Premium',
    price: 1999,
    features: [
      'Unlimited new patients per month',
      'Unlimited staff accounts',
      'Up to 5 branches',
      'Appointment booking',
      'Public booking page',
      'Queue management',
      'Revenue tracking',
      'Email notifications to patients',
      'Full analytics',
      'Custom branding',
      'Priority support',
    ],
    limits: [] as string[],
  },
]

const planName = computed(() => {
  if (!subscription.value) return 'Free Trial'
  return availablePlans.find(p => p.id === subscription.value?.plan)?.name ?? 'Unknown'
})

const isCurrentPlan = (planId: ClinicPlan) => {
  return subscription.value?.plan === planId && subscription.value?.status === 'active'
}

const getPlanButtonLabel = (planId: ClinicPlan) => {
  if (!subscription.value) return 'Upgrade'
  const planOrder = ['starter', 'pro', 'premium']
  const currentIndex = planOrder.indexOf(subscription.value.plan)
  const targetIndex = planOrder.indexOf(planId)
  return targetIndex > currentIndex ? 'Upgrade' : 'Switch'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const dayOfMonth = (dateStr: string) => new Date(dateStr).getDate()

const capitalizePlan = (plan: ClinicPlan) =>
  plan.charAt(0).toUpperCase() + plan.slice(1)

const confirmUpgrade = (plan: typeof availablePlans[0]) => {
  pendingPlan.value = plan
  showConfirmModal.value = true
}

const proceedUpgrade = () => {
  showConfirmModal.value = false
  if (pendingPlan.value) {
    upgradePlan(pendingPlan.value.id)
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  router.replace({ query: {} })
}

const closeFailedModal = () => {
  showFailedModal.value = false
  router.replace({ query: {} })
}

const retryPayment = () => {
  closeFailedModal()
  if (lastAttemptedPlan.value) {
    const plan = availablePlans.find(p => p.id === lastAttemptedPlan.value)
    if (plan) confirmUpgrade(plan)
  }
}

async function pollForActivation(maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))
    if (!clinic.value) break

    const { data } = await subscriptionService.getActiveSubscription(clinic.value.id)
    if (data?.status === 'active') {
      subscription.value = data
      activatedPlanName.value = availablePlans.find(p => p.id === data.plan)?.name ?? data.plan

      const historyResult = await subscriptionService.getClinicSubscriptions(clinic.value.id)
      if (historyResult.data) subscriptionHistory.value = historyResult.data

      isActivating.value = false
      showSuccessModal.value = true
      return
    }
  }

  // Webhook took too long — still show success
  isActivating.value = false
  activatedPlanName.value = 'your new'
  showSuccessModal.value = true
}

const loadPaymentCheckout = async () => {
  if (!clinic.value || !subscription.value) return
  isLoading.value = true

  try {
    const result = await paymongoSubscriptionService.createPaymentLink(
      clinic.value.id,
      clinic.value.name,
      subscription.value.plan,
      window.location.origin
    )

    if (result.error || !result.data) {
      showFailedModal.value = true
      return
    }

    window.location.href = result.data.checkout_url
  } catch {
    showFailedModal.value = true
  } finally {
    isLoading.value = false
  }
}

const upgradePlan = async (newPlan: ClinicPlan) => {
  if (!clinic.value) return

  // Guard: already on this plan and active
  if (subscription.value?.plan === newPlan && subscription.value?.status === 'active') return

  isLoading.value = true
  lastAttemptedPlan.value = newPlan

  try {
    const result = await paymongoSubscriptionService.createPaymentLink(
      clinic.value.id,
      clinic.value.name,
      newPlan,
      window.location.origin
    )

    if (result.error || !result.data) {
      showFailedModal.value = true
      return
    }

    const planPrice = availablePlans.find(p => p.id === newPlan)?.price ?? 0
    const { error: subError } = await subscriptionService.createSubscription({
      clinic_id: clinic.value.id,
      plan: newPlan,
      payment_link_id: result.data.id,
      reference_number: result.data.reference_number,
      amount: planPrice * 100,
    })

    if (subError) {
      showFailedModal.value = true
      return
    }

    window.location.href = result.data.checkout_url
  } catch {
    showFailedModal.value = true
  } finally {
    isLoading.value = false
  }
}

async function loadData() {
  if (!clinic.value) return

  isLoadingData.value = true

  const activeResult = await subscriptionService.getActiveSubscription(clinic.value.id)
  if (activeResult.data) subscription.value = activeResult.data

  const historyResult = await subscriptionService.getClinicSubscriptions(clinic.value.id)
  if (historyResult.data) subscriptionHistory.value = historyResult.data

  isLoadingData.value = false

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
  transition: all 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>