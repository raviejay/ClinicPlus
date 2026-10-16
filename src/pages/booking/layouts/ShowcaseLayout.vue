<template>
  <div class="flex-1 flex flex-col lg:flex-row bg-[#fbf9f4]">
    <!-- Dark panel: the clinic, and where to find it -->
    <aside class="lg:w-[26rem] xl:w-[30rem] shrink-0 text-white relative overflow-hidden"
      :style="{ background: `linear-gradient(165deg, ${ctx.secondaryColor} 0%, #0b0d12 82%)` }">
      <span class="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.12]" :style="{ background: GOLD }"></span>
      <div class="relative lg:sticky lg:top-0 lg:h-screen flex flex-col px-7 sm:px-10 py-9 gap-7">
        <div class="flex items-center gap-4">
          <img v-if="ctx.logoUrl" :src="ctx.logoUrl" alt="Logo" class="w-14 h-14 rounded-full object-contain bg-white p-1.5 ring-1 ring-white/30 shrink-0" />
          <span v-else class="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl shrink-0 ring-1"
            :style="{ color: GOLD, '--tw-ring-color': GOLD + '80' }">{{ ctx.clinic.name.charAt(0).toUpperCase() }}</span>
          <p class="text-[11px] uppercase tracking-[0.3em] text-white/50">Private practice</p>
        </div>

        <div>
          <span class="block w-10 h-px mb-5" :style="{ background: GOLD }"></span>
          <h1 class="font-display text-4xl xl:text-5xl leading-[1.08]">{{ ctx.clinic.name }}</h1>
          <p v-if="ctx.branch" class="mt-2 text-sm text-white/60 tracking-wide">{{ ctx.branch.name }}</p>
        </div>

        <dl class="space-y-4 text-sm">
          <div class="flex gap-4">
            <dt class="material-icons text-[18px] mt-0.5" :style="{ color: GOLD }">schedule</dt>
            <dd><span class="block text-[10px] uppercase tracking-[0.2em] text-white/40">Hours</span>{{ ctx.openingHours }}</dd>
          </div>
          <div v-if="ctx.location.address" class="flex gap-4">
            <dt class="material-icons text-[18px] mt-0.5" :style="{ color: GOLD }">place</dt>
            <dd><span class="block text-[10px] uppercase tracking-[0.2em] text-white/40">Address</span>{{ ctx.location.address }}</dd>
          </div>
          <div v-if="ctx.location.phone" class="flex gap-4">
            <dt class="material-icons text-[18px] mt-0.5" :style="{ color: GOLD }">call</dt>
            <dd>
              <span class="block text-[10px] uppercase tracking-[0.2em] text-white/40">Telephone</span>
              <a :href="telUrl(ctx.location.phone)" class="hover:underline">{{ ctx.location.phone }}</a>
            </dd>
          </div>
        </dl>

        <div class="flex-1 min-h-[14rem] flex flex-col">
          <ClinicMap :query="ctx.location.mapQuery" :name="ctx.clinic.name" :accent="GOLD" rounded="rounded-sm"
            tone="grayscale(0.55) contrast(1.05) brightness(0.95)"
            class="flex-1 ring-1 ring-white/20 p-0" />
        </div>
        <p class="text-[10px] uppercase tracking-[0.25em] text-white/30">Powered by ClinicGo</p>
      </div>
    </aside>

    <!-- Ivory sheet: the booking -->
    <main class="flex-1 px-6 sm:px-12 xl:px-20 py-10 lg:py-14">
      <div class="max-w-xl mx-auto">
        <p class="text-[11px] uppercase tracking-[0.3em] text-stone-400">Reservations</p>
        <h2 class="font-display text-3xl sm:text-4xl text-stone-900 mt-2">Book an appointment</h2>
        <p class="text-sm text-stone-500 mt-2">A few details, a time that suits you — we'll take it from there.</p>

        <section v-for="s in sections" :key="s.numeral" class="mt-10" :aria-labelledby="`bk-s-${s.numeral}`">
          <div class="flex items-baseline gap-4 mb-5">
            <span class="font-display text-sm" :style="{ color: GOLD }">{{ s.numeral }}</span>
            <h3 :id="`bk-s-${s.numeral}`" class="font-display text-xl text-stone-900">{{ s.title }}</h3>
            <span class="flex-1 h-px bg-stone-200 self-center"></span>
            <span v-if="s.optional" class="text-[10px] uppercase tracking-[0.18em] text-stone-400">Optional</span>
          </div>
          <InfoFields v-if="s.key === 'info'" look="refined" />
          <ServicePicker v-else-if="s.key === 'service'" look="refined" />
          <SchedulePicker v-else look="refined" />
        </section>

        <div class="mt-10">
          <BookingSummary look="refined" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { telUrl } from '@/utils/booking'
import { useBooking } from '../bookingContext'
import ClinicMap from '../ClinicMap.vue'
import InfoFields from '../sections/InfoFields.vue'
import ServicePicker from '../sections/ServicePicker.vue'
import SchedulePicker from '../sections/SchedulePicker.vue'
import BookingSummary from '../sections/BookingSummary.vue'

const GOLD = '#c9a96e'
const ctx = useBooking()

const sections = computed(() => [
  { key: 'info', numeral: 'I', title: 'About you', optional: false },
  ...(ctx.categories.length > 0 ? [{ key: 'service', numeral: 'II', title: 'Your visit', optional: true }] : []),
  { key: 'when', numeral: ctx.categories.length > 0 ? 'III' : 'II', title: 'Date & time', optional: false },
])
</script>
