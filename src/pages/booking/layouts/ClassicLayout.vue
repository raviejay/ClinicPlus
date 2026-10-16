<template>
  <div class="flex-1 flex flex-col">
    <header class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
        <img v-if="ctx.logoUrl" :src="ctx.logoUrl" alt="Logo"
          class="w-11 h-11 rounded-xl object-contain border border-gray-100 bg-white p-0.5 shadow-sm" />
        <div v-else class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm"
          :style="{ background: ctx.primaryColor }">
          {{ ctx.clinic.name.charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <h1 class="font-black text-slate-900 text-base leading-tight truncate">{{ ctx.clinic.name }}</h1>
          <p class="text-xs text-slate-400 truncate">{{ ctx.branch ? ctx.branch.name + ' · ' : '' }}Online Appointment Booking</p>
        </div>
        <a v-if="ctx.location.hasAddress" :href="directionsUrl(ctx.location.mapQuery)" target="_blank" rel="noopener"
          class="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border transition-colors hover:bg-slate-50"
          :style="{ color: ctx.primaryColor, borderColor: ctx.primaryColor + '40' }">
          <span class="material-icons text-[16px]">near_me</span><span class="hidden sm:inline">Navigate</span>
        </a>
        <a v-else-if="ctx.location.phone" :href="telUrl(ctx.location.phone)"
          class="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border transition-colors hover:bg-slate-50"
          :style="{ color: ctx.primaryColor, borderColor: ctx.primaryColor + '40' }">
          <span class="material-icons text-[16px]">call</span><span class="hidden sm:inline">Call</span>
        </a>
      </div>

      <!-- Progress -->
      <div class="border-t border-gray-100">
        <ol class="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1" aria-label="Booking steps">
          <li v-for="(step, i) in steps" :key="step" class="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            :style="{ color: i <= ctx.currentStep ? ctx.primaryColor : '#cbd5e1' }">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
              :style="i < ctx.currentStep ? { background: ctx.primaryColor, borderColor: ctx.primaryColor, color: '#fff' } : { borderColor: i === ctx.currentStep ? ctx.primaryColor : '#e2e8f0' }">
              <span v-if="i < ctx.currentStep" class="material-icons text-[11px]">check</span>
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="hidden sm:inline">{{ step }}</span>
            <span v-if="i < steps.length - 1" class="material-icons text-[14px] ml-1 text-slate-200">chevron_right</span>
          </li>
        </ol>
      </div>
    </header>

    <main class="flex-1 px-4 sm:px-6 py-6">
      <div class="max-w-6xl mx-auto grid gap-5 lg:grid-cols-2 lg:gap-6 lg:items-start max-lg:max-w-2xl">
        <!-- Left: who and what -->
        <div class="space-y-5">
          <section :class="card" aria-labelledby="bk-h-info">
            <div :class="cardHead">
              <span :class="iconBox" :style="{ background: ctx.primaryColor + '18' }">
                <span class="material-icons text-[15px]" :style="{ color: ctx.primaryColor }">person</span>
              </span>
              <h2 id="bk-h-info" class="text-sm font-bold text-slate-800">Your Information</h2>
              <span v-if="infoComplete" class="ml-auto material-icons text-[18px] text-emerald-500">check_circle</span>
            </div>
            <div class="p-5"><InfoFields /></div>
          </section>

          <section :class="card" aria-labelledby="bk-h-service">
            <div :class="cardHead">
              <span :class="iconBox" :style="{ background: ctx.primaryColor + '18' }">
                <span class="material-icons text-[15px]" :style="{ color: ctx.primaryColor }">medical_services</span>
              </span>
              <h2 id="bk-h-service" class="text-sm font-bold text-slate-800">What do you need?</h2>
              <span v-if="ctx.form.service_name" class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                :style="{ background: ctx.primaryColor }">Selected ✓</span>
              <span v-else class="ml-auto text-[11px] text-slate-400">Optional</span>
            </div>
            <div class="p-5"><ServicePicker /></div>
          </section>
        </div>

        <!-- Right: when, then confirm -->
        <div class="space-y-5">
          <section :class="card" aria-labelledby="bk-h-when">
            <div :class="cardHead">
              <span :class="iconBox" :style="{ background: ctx.primaryColor + '18' }">
                <span class="material-icons text-[15px]" :style="{ color: ctx.primaryColor }">calendar_month</span>
              </span>
              <h2 id="bk-h-when" class="text-sm font-bold text-slate-800">Pick a date &amp; time</h2>
            </div>
            <div class="p-5"><SchedulePicker /></div>
          </section>

          <BookingSummary />
        </div>
      </div>

      <p class="text-center text-xs text-slate-300 pt-6 pb-2">
        Powered by <span class="font-semibold text-slate-400">ClinicGo</span>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { directionsUrl, isValidPhone, telUrl } from '@/utils/booking'
import { useBooking } from '../bookingContext'
import InfoFields from '../sections/InfoFields.vue'
import ServicePicker from '../sections/ServicePicker.vue'
import SchedulePicker from '../sections/SchedulePicker.vue'
import BookingSummary from '../sections/BookingSummary.vue'

const ctx = useBooking()
const steps = ['Your Info', 'Service', 'Schedule']

const card = 'bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden'
const cardHead = 'flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50'
const iconBox = 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0'

const infoComplete = computed(() => ctx.form.full_name.trim().length >= 2 && isValidPhone(ctx.form.contact_number))
</script>
