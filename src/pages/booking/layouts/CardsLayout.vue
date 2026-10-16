<template>
  <div class="flex-1 flex flex-col">
    <!-- Hero -->
    <header class="relative overflow-hidden text-white"
      :style="{ background: `linear-gradient(135deg, ${ctx.primaryColor} 0%, ${ctx.secondaryColor} 100%)` }">
      <span class="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10"></span>
      <span class="absolute top-24 -left-16 w-48 h-48 rounded-full bg-white/[0.07]"></span>
      <span class="absolute -bottom-20 right-1/3 w-56 h-56 rounded-full bg-black/10"></span>

      <div class="relative max-w-3xl mx-auto px-5 pt-8 pb-20 sm:pt-10 sm:pb-24">
        <div class="flex items-center gap-4">
          <img v-if="ctx.logoUrl" :src="ctx.logoUrl" alt="Logo"
            class="w-16 h-16 rounded-3xl object-contain bg-white p-2 shadow-xl shrink-0" />
          <div v-else class="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-3xl shadow-xl shrink-0">
            {{ ctx.clinic.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-white/70 uppercase tracking-widest">Book online</p>
            <h1 class="text-2xl sm:text-3xl font-black leading-tight truncate">{{ ctx.clinic.name }}</h1>
            <p v-if="ctx.branch" class="text-sm text-white/70">{{ ctx.branch.name }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mt-5">
          <span class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full pl-2.5 pr-3.5 py-1.5 text-xs font-semibold">
            <span class="material-icons text-[15px]">schedule</span>{{ ctx.openingHours }}
          </span>
          <a v-if="ctx.location.address" :href="directionsUrl(ctx.location.mapQuery)" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full pl-2.5 pr-3.5 py-1.5 text-xs font-semibold hover:bg-white/25 transition-colors max-w-full">
            <span class="material-icons text-[15px]">place</span><span class="truncate">{{ ctx.location.address }}</span>
          </a>
          <a v-if="ctx.location.phone" :href="telUrl(ctx.location.phone)"
            class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full pl-2.5 pr-3.5 py-1.5 text-xs font-semibold hover:bg-white/25 transition-colors">
            <span class="material-icons text-[15px]">call</span>{{ ctx.location.phone }}
          </a>
        </div>
      </div>
    </header>

    <!-- Wizard card -->
    <main class="flex-1 px-4 pb-28 sm:pb-10 -mt-12 relative">
      <div class="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-white overflow-hidden">
        <!-- Segmented progress -->
        <div class="px-5 sm:px-8 pt-6">
          <ol class="flex gap-2" aria-label="Booking steps">
            <li v-for="(s, i) in steps" :key="s.id" class="flex-1" :aria-current="i === index ? 'step' : undefined">
              <span class="block h-1.5 rounded-full transition-all duration-500"
                :style="{ background: i <= index ? ctx.primaryColor : '#e2e8f0', opacity: i < index ? 0.55 : 1 }"></span>
              <span class="hidden sm:block text-[11px] font-bold mt-1.5 transition-colors"
                :style="{ color: i <= index ? ctx.primaryColor : '#cbd5e1' }">{{ s.label }}</span>
            </li>
          </ol>
          <p class="sm:hidden text-[11px] font-bold mt-2 text-slate-400 uppercase tracking-wider">
            Step {{ index + 1 }} of {{ steps.length }} · <span :style="{ color: ctx.primaryColor }">{{ current.label }}</span>
          </p>
        </div>

        <div class="px-5 sm:px-8 py-6 min-h-[22rem]">
          <Transition name="wizard" mode="out-in">
            <section :key="current.id" :aria-label="current.label">
              <template v-if="current.id === 'service'">
                <h2 class="text-xl font-black text-slate-900">What do you need?</h2>
                <p class="text-sm text-slate-400 mb-5">Choose a service — or skip it and tell us in the notes.</p>
                <ServicePicker tiles />
              </template>

              <template v-else-if="current.id === 'when'">
                <h2 class="text-xl font-black text-slate-900">Pick a date &amp; time</h2>
                <p class="text-sm text-slate-400 mb-5">Times already taken are crossed out.</p>
                <div class="grid md:grid-cols-[18rem_1fr] gap-6">
                  <div class="md:border-r md:border-gray-100 md:pr-6">
                    <MonthCalendar v-model="ctx.form.appointment_date" :min="ctx.today" :primary-color="ctx.primaryColor" />
                  </div>
                  <SchedulePicker calendar="none" :notes="false" />
                </div>
              </template>

              <template v-else-if="current.id === 'details'">
                <h2 class="text-xl font-black text-slate-900">Your details</h2>
                <p class="text-sm text-slate-400 mb-5">So the clinic knows who is coming.</p>
                <InfoFields />
                <div class="mt-4">
                  <label for="bk-notes" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Additional Notes <span class="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
                  </label>
                  <textarea id="bk-notes" v-model="ctx.form.notes" rows="3" maxlength="1000"
                    placeholder="Allergies, special concerns, or anything your clinic should know…"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"></textarea>
                </div>
              </template>

              <template v-else>
                <h2 class="text-xl font-black text-slate-900">Review &amp; confirm</h2>
                <p class="text-sm text-slate-400 mb-5">One last look before we book it.</p>
                <div class="rounded-2xl bg-slate-50 border border-gray-100 px-5 py-4 mb-4 space-y-1">
                  <p class="font-bold text-slate-900">{{ ctx.form.full_name }}</p>
                  <p class="text-sm text-slate-500">{{ ctx.form.contact_number }}<template v-if="ctx.form.email.trim()"> · {{ ctx.form.email.trim() }}</template></p>
                </div>
                <BookingSummary :action="false" />
              </template>
            </section>
          </Transition>

          <!-- Messages that apply to every step (e.g. someone took your time) -->
          <div v-if="current.id !== 'review'" class="mt-4 space-y-3">
            <div v-if="ctx.notice" role="status" class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span class="material-icons text-amber-500 text-[18px] mt-0.5 shrink-0">info</span>
              <p class="text-sm text-amber-800">{{ ctx.notice }}</p>
            </div>
          </div>
        </div>

        <!-- Action bar -->
        <div class="fixed sm:static bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100 px-5 sm:px-8 py-4 flex items-center gap-3">
          <button v-if="index > 0" type="button" @click="back"
            class="px-5 py-3 rounded-full border border-gray-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Back
          </button>
          <p v-if="blocker && current.id !== 'review'" class="hidden sm:block text-xs text-slate-400 ml-auto mr-1">{{ blocker }}</p>
          <button v-if="current.id !== 'review'" type="button" @click="next" :disabled="Boolean(blocker)"
            :style="!blocker ? { background: ctx.primaryColor } : {}"
            :class="['flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-1.5 px-7 py-3 rounded-full text-sm font-bold text-white disabled:bg-slate-200 disabled:cursor-not-allowed transition-all active:scale-95', blocker ? 'sm:ml-0' : '']">
            {{ current.id === 'service' && !ctx.form.service_name ? 'Skip' : 'Continue' }}
            <span class="material-icons text-[18px]">arrow_forward</span>
          </button>
          <button v-else type="button" @click="ctx.book()" :disabled="ctx.saving || !ctx.canSubmit"
            :style="ctx.canSubmit ? { background: ctx.primaryColor } : {}"
            class="flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-bold text-white disabled:bg-slate-200 disabled:cursor-not-allowed transition-all active:scale-95">
            <span :class="['material-icons text-[18px]', ctx.saving ? 'animate-spin' : '']">{{ ctx.saving ? 'autorenew' : 'event_available' }}</span>
            {{ ctx.saving ? 'Confirming…' : 'Confirm Appointment' }}
          </button>
        </div>
      </div>

      <div v-if="current.id === 'review' && ctx.errorMsg" role="alert"
        class="max-w-3xl mx-auto mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <span class="material-icons text-red-500 text-[18px] mt-0.5 shrink-0">error_outline</span>
        <p class="text-sm text-red-600">{{ ctx.errorMsg }}</p>
      </div>

      <p class="text-center text-xs text-slate-300 pt-6">
        Powered by <span class="font-semibold text-slate-400">ClinicGo</span>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { directionsUrl, isValidEmail, isValidPhone, telUrl } from '@/utils/booking'
import { useBooking } from '../bookingContext'
import InfoFields from '../sections/InfoFields.vue'
import ServicePicker from '../sections/ServicePicker.vue'
import SchedulePicker from '../sections/SchedulePicker.vue'
import BookingSummary from '../sections/BookingSummary.vue'
import MonthCalendar from '../MonthCalendar.vue'

type StepId = 'service' | 'when' | 'details' | 'review'
const ctx = useBooking()

// The service step only exists when the clinic has services to choose from
const steps = computed<{ id: StepId; label: string }[]>(() => [
  ...(ctx.categories.length > 0 ? [{ id: 'service' as const, label: 'Service' }] : []),
  { id: 'when', label: 'Date & time' },
  { id: 'details', label: 'Your details' },
  { id: 'review', label: 'Review' },
])

const index = ref(0)
const current = computed(() => steps.value[Math.min(index.value, steps.value.length - 1)])

const blocker = computed(() => {
  if (current.value.id === 'when' && !ctx.form.time_slot) return 'Pick a time to continue'
  if (current.value.id === 'details') {
    if (ctx.form.full_name.trim().length < 2) return 'Enter your name to continue'
    if (!isValidPhone(ctx.form.contact_number)) return 'Enter a valid phone number'
    if (ctx.form.email.trim() && !isValidEmail(ctx.form.email)) return 'Check your email address'
  }
  return ''
})

const next = () => { if (!blocker.value && index.value < steps.value.length - 1) index.value++ }
const back = () => { if (index.value > 0) index.value-- }

// If the chosen time was taken, send them back to choose another
watch(() => ctx.notice, notice => {
  if (!notice || ctx.form.time_slot) return
  const when = steps.value.findIndex(s => s.id === 'when')
  if (index.value > when) index.value = when
})
</script>

<style scoped>
.wizard-enter-active, .wizard-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.wizard-enter-from { opacity: 0; transform: translateX(14px); }
.wizard-leave-to { opacity: 0; transform: translateX(-14px); }
@media (prefers-reduced-motion: reduce) {
  .wizard-enter-active, .wizard-leave-active { transition: none; }
}
</style>
