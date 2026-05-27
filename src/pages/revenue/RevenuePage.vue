<template>
  <AppLayout>
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Revenue</h1>
          <p class="text-xs text-slate-400 mt-0.5">{{ todayLabel }}</p>
        </div>
        <RouterLink to="/revenue/record"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Record
        </RouterLink>
      </div>

      <FeatureGate feature="revenue" label="Revenue Tracking" required-plan="Pro or Premium">
        <div class="space-y-4">

          <!-- Date picker -->
          <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button v-for="d in dateStrip" :key="d.value" @click="selectedDate = d.value"
              :class="[
                'flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors',
                selectedDate === d.value
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                  : 'bg-white border border-gray-200 text-slate-500 hover:border-sky-200'
              ]">
              <span class="opacity-75">{{ d.day }}</span>
              <span class="text-base font-black">{{ d.date }}</span>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-10">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <template v-else>
            <!-- Total revenue card -->
            <div class="bg-slate-900 rounded-2xl p-5 text-white">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <p class="text-4xl font-black tracking-tight">₱{{ formatMoney(summary.total) }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ summary.count }} payment{{ summary.count !== 1 ? 's' : '' }}</p>

              <!-- Method breakdown -->
              <div class="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
                <div v-for="method in methodBreakdown" :key="method.key"
                  v-show="method.amount > 0"
                  class="text-center">
                  <p class="text-base font-black">₱{{ formatMoney(method.amount) }}</p>
                  <p class="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                    {{ method.icon }} {{ method.label }}
                  </p>
                </div>
                <div v-if="summary.total === 0" class="col-span-3 text-center text-slate-500 text-xs py-2">
                  No payments recorded
                </div>
              </div>
            </div>

            <!-- Method bars -->
            <div v-if="summary.total > 0" class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">By Payment Method</p>
              <div v-for="method in methodBreakdown.filter(m => m.amount > 0)" :key="method.key" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="flex items-center gap-1.5 font-medium text-slate-700">
                    {{ method.icon }} {{ method.label }}
                  </span>
                  <span class="font-bold text-slate-900">₱{{ formatMoney(method.amount) }}</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                    :style="{
                      width: `${(method.amount / summary.total) * 100}%`,
                      background: method.color
                    }">
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment list -->
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Transactions</p>

              <div v-if="summary.payments.length === 0"
                class="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <div class="text-2xl mb-2">💰</div>
                <p class="text-sm font-semibold text-slate-600">No payments today</p>
                <p class="text-xs text-slate-400 mt-1">Recorded payments will appear here</p>
              </div>

              <div v-else class="space-y-2">
                <div v-for="payment in summary.payments" :key="payment.id"
                  class="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      :style="{ background: methodColor(payment.payment_method) + '20' }">
                      {{ methodIcon(payment.payment_method) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-900 truncate">
                        {{ (payment as any).patients?.full_name ?? 'Unknown' }}
                      </p>
                      <p class="text-xs text-slate-400 capitalize">{{ payment.payment_method }} • {{ formatTime(payment.paid_at) }}</p>
                    </div>
                  </div>
                  <p class="text-sm font-black text-green-600 shrink-0">₱{{ formatMoney(payment.amount) }}</p>
                </div>
              </div>
            </div>

          </template>
        </div>
      </FeatureGate>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { paymentService } from '@/services/payment.service'
import { useClinic } from '@/composables/useClinic'
import AppLayout from '@/layouts/AppLayout.vue'
import FeatureGate from '@/components/ui/FeatureGate.vue'

const authStore = useAuthStore()
const { watchBranchChange } = useBranchFilter()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const loading = ref(true)
const summary = ref<Awaited<ReturnType<typeof paymentService.getSummary>>>({
  total: 0, byMethod: { cash: 0, gcash: 0, maya: 0, card: 0, other: 0 }, count: 0, payments: []
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const dateStrip = computed(() => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { value: d.toISOString().split('T')[0], day: days[d.getDay()], date: d.getDate() }
  })
})

const methodBreakdown = computed(() => [
  { key: 'cash',  label: 'Cash',  icon: '💵', color: '#22c55e', amount: summary.value.byMethod.cash },
  { key: 'gcash', label: 'GCash', icon: '📱', color: '#3b82f6', amount: summary.value.byMethod.gcash },
  { key: 'maya',  label: 'Maya',  icon: '💳', color: '#8b5cf6', amount: summary.value.byMethod.maya },
  { key: 'card',  label: 'Card',  icon: '💳', color: '#f59e0b', amount: summary.value.byMethod.card },
  { key: 'other', label: 'Other', icon: '🏦', color: '#64748b', amount: summary.value.byMethod.other },
])

function formatMoney(amount: number) {
  return Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function methodIcon(method: string) {
  return { cash: '💵', gcash: '📱', maya: '💳', card: '💳', other: '🏦' }[method] ?? '💰'
}

function methodColor(method: string) {
  return { cash: '#22c55e', gcash: '#3b82f6', maya: '#8b5cf6', card: '#f59e0b', other: '#64748b' }[method] ?? '#64748b'
}

async function loadSummary() {
  if (!authStore.clinic?.id) return
  loading.value = true
  summary.value = await paymentService.getSummary(authStore.clinic.id, selectedDate.value)
  loading.value = false
}

watch(selectedDate, loadSummary)

onMounted(() => {
  loadSummary()
  watchBranchChange(loadSummary)
})
</script>