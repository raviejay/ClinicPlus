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

    <!-- Current Plan Card -->
    <div v-if="subscription" class="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
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

    <!-- Plan Comparison -->
    <div class="mb-8">
      <h3 class="text-xl font-black text-slate-900 mb-4">Available Plans</h3>
      <div class="grid md:grid-cols-3 gap-4">
        <div v-for="plan in availablePlans" :key="plan.name"
          :class="[
            'bg-white border rounded-2xl p-6 transition-all',
            subscription?.plan === plan.id ? 'border-sky-500 border-2 shadow-lg bg-sky-50' : 'border-gray-200'
          ]">
          <h4 class="font-black text-slate-900 text-lg mb-2">{{ plan.name }}</h4>
          <div class="text-2xl font-black text-slate-900 mb-4">
            ₱{{ (plan.price).toLocaleString('en-US') }}
            <span class="text-sm font-normal text-slate-500">/month</span>
          </div>
          <ul class="space-y-2 text-sm text-slate-700 mb-6">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
              <span class="text-green-500 font-bold mt-0.5">✓</span> {{ feature }}
            </li>
          </ul>
          <button v-if="subscription?.plan !== plan.id"
            @click="upgradePlan(plan.id)"
            :disabled="isLoading || isActivating"
            class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-2 rounded-lg transition-colors text-sm">
            {{ isLoading ? 'Processing...' : 'Upgrade' }}
          </button>
          <div v-else class="text-center text-sm font-bold text-sky-600">
            Current Plan
          </div>
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
                  sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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

    <!-- Error Alert -->
    <div v-if="error" class="fixed bottom-6 right-6 bg-red-100 border border-red-300 rounded-xl p-4 max-w-sm">
      <p class="text-sm font-semibold text-red-700">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
const error = ref<string | null>(null)

const availablePlans = [
  {
    id: 'starter' as ClinicPlan,
    name: 'Starter',
    price: 599,
    features: ['Up to 50 patients', '1 admin account', 'Appointment booking', 'Public booking page']
  },
  {
    id: 'pro' as ClinicPlan,
    name: 'Pro',
    price: 899,
    features: ['Up to 500 patients', 'Up to 5 users', 'Queue management', 'Revenue tracking']
  },
  {
    id: 'premium' as ClinicPlan,
    name: 'Premium',
    price: 1999,
    features: ['Unlimited patients', 'Unlimited users', 'Multi-branch', 'Full analytics', 'Custom branding']
  },
]

const planName = computed(() => {
  if (!subscription.value) return 'No active subscription'
  return availablePlans.find(p => p.id === subscription.value?.plan)?.name ?? 'Unknown'
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const dayOfMonth = (dateStr: string) => {
  return new Date(dateStr).getDate()
}

const capitalizePlan = (plan: ClinicPlan) => {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

// Poll DB until subscription is active (webhook fires async after redirect)
async function pollForActivation(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000)) // 2s between each check

    if (!clinic.value) break

    const { data } = await subscriptionService.getActiveSubscription(clinic.value.id)
    if (data?.status === 'active') {
      subscription.value = data

      // Refresh history
      const historyResult = await subscriptionService.getClinicSubscriptions(clinic.value.id)
      if (historyResult.data) subscriptionHistory.value = historyResult.data

      isActivating.value = false

      // Clean up ?status=success from URL
      router.replace({ query: {} })
      return
    }
  }

  // Webhook took too long — show soft warning, not a hard error
  isActivating.value = false
  error.value = 'Payment received! Your plan should activate shortly. Refresh if it does not update in a minute.'
}

const loadPaymentCheckout = async () => {
  if (!clinic.value || !subscription.value) return

  isLoading.value = true
  error.value = null

  try {
    const result = await paymongoSubscriptionService.createPaymentLink(
      clinic.value.id,
      clinic.value.name,
      subscription.value.plan,
      `${window.location.origin}/billing`
    )

    if (result.error || !result.data) {
      error.value = result.error ?? 'Failed to load payment checkout'
      return
    }

    window.location.href = result.data.checkout_url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load payment checkout'
  } finally {
    isLoading.value = false
  }
}

const upgradePlan = async (newPlan: ClinicPlan) => {
  if (!clinic.value) return

  isLoading.value = true
  error.value = null

  try {
    // Step 1: Create PayMongo payment link
    const result = await paymongoSubscriptionService.createPaymentLink(
      clinic.value.id,
      clinic.value.name,
      newPlan,
      `${window.location.origin}/billing`
    )

    if (result.error || !result.data) {
      error.value = result.error ?? 'Failed to create payment link'
      return
    }

    // Step 2: Save a pending subscription record so the webhook can find and activate it
    const planPrice = availablePlans.find(p => p.id === newPlan)?.price ?? 0
    const { error: subError } = await subscriptionService.createSubscription({
      clinic_id: clinic.value.id,
      plan: newPlan,
      payment_link_id: result.data.id,
      reference_number: result.data.reference_number,
      amount: planPrice * 100, // store in centavos to match PayMongo
    })

    if (subError) {
      error.value = subError
      return
    }

    // Step 3: Redirect to PayMongo checkout
    window.location.href = result.data.checkout_url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to process upgrade'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!clinic.value) return

  // Load current active subscription
  const activeResult = await subscriptionService.getActiveSubscription(clinic.value.id)
  if (activeResult.data) {
    subscription.value = activeResult.data
  }

  // Load subscription history
  const historyResult = await subscriptionService.getClinicSubscriptions(clinic.value.id)
  if (historyResult.data) {
    subscriptionHistory.value = historyResult.data
  }

  // Handle redirect back from PayMongo
  const status = route.query.status
  if (status === 'success') {
    isActivating.value = true
    await pollForActivation()
  } else if (status === 'failed') {
    error.value = 'Payment failed or was cancelled. Please try again.'
  }
})
</script>