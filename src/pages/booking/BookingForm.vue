<template>
  <div class="space-y-4">

    <!-- Section 1: Your Info -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          :style="{ background: primaryColor + '18' }">
          <span class="material-icons text-[15px]" :style="{ color: primaryColor }">person</span>
        </div>
        <h2 class="text-sm font-bold text-slate-800">Your Information</h2>
        <span v-if="infoComplete" class="ml-auto material-icons text-[18px] text-emerald-500">check_circle</span>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label for="bk-name" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Full Name <span class="text-red-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">badge</span>
            <input id="bk-name" v-model="form.full_name" type="text" placeholder="Juan Dela Cruz" autocomplete="name"
              @blur="touched.name = true"
              :class="[inputClass, nameError ? 'border-red-300' : 'border-gray-200']" />
          </div>
          <p v-if="nameError" class="text-xs text-red-500 mt-1.5">{{ nameError }}</p>
        </div>
        <div>
          <label for="bk-phone" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Contact Number <span class="text-red-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">phone</span>
            <input id="bk-phone" v-model="form.contact_number" type="tel" inputmode="tel" placeholder="09XX XXX XXXX"
              autocomplete="tel" @blur="touched.phone = true"
              :class="[inputClass, phoneError ? 'border-red-300' : 'border-gray-200']" />
          </div>
          <p v-if="phoneError" class="text-xs text-red-500 mt-1.5">{{ phoneError }}</p>
          <p v-else class="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span class="material-icons text-[13px]">info</span>
            No account needed — the clinic uses this number to find your record.
          </p>
        </div>
        <div>
          <label for="bk-email" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Email Address
            <span class="text-slate-300 font-normal normal-case tracking-normal">(optional — for your confirmation)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">mail_outline</span>
            <input id="bk-email" v-model="form.email" type="email" inputmode="email" placeholder="patient@email.com"
              autocomplete="email" @blur="touched.email = true"
              :class="[inputClass, emailError ? 'border-red-300' : 'border-gray-200']" />
          </div>
          <p v-if="emailError" class="text-xs text-red-500 mt-1.5">{{ emailError }}</p>
        </div>
      </div>
    </div>

    <!-- Section 2: Service -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          :style="{ background: primaryColor + '18' }">
          <span class="material-icons text-[15px]" :style="{ color: primaryColor }">medical_services</span>
        </div>
        <h2 class="text-sm font-bold text-slate-800">What do you need?</h2>
        <span v-if="form.service_name"
          class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          :style="{ background: primaryColor }">Selected ✓</span>
        <span v-else class="ml-auto text-[11px] text-slate-400">Optional</span>
      </div>
      <div class="p-5">

        <div v-if="categories.length === 0" class="text-center py-6 text-xs text-slate-400">
          <span class="material-icons text-slate-300 text-3xl block mb-2">medical_services</span>
          This clinic hasn't listed services yet — you can still book and tell them what you need in the notes.
        </div>

        <div v-else-if="!selectedCategory" class="grid grid-cols-2 gap-2">
          <button v-for="cat in categories" :key="cat.id" type="button"
            @click="$emit('update:selectedCategory', cat)"
            class="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-left transition-all active:scale-95">
            <span class="text-2xl">{{ cat.icon }}</span>
            <div class="min-w-0">
              <span class="text-xs font-semibold text-slate-700 leading-tight block">{{ cat.label }}</span>
              <span class="text-[10px] text-slate-400">{{ cat.services.length }} service{{ cat.services.length !== 1 ? 's' : '' }}</span>
            </div>
          </button>
        </div>

        <div v-else class="space-y-3">
          <button type="button" @click="$emit('update:selectedCategory', null); form.service_name = ''"
            class="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            :style="{ color: primaryColor }">
            <span class="material-icons text-[15px]">arrow_back</span>
            {{ selectedCategory.icon }} {{ selectedCategory.label }}
          </button>
          <div class="grid grid-cols-1 gap-1.5">
            <button v-for="svc in selectedCategory.services" :key="svc" type="button"
              @click="form.service_name = svc" :aria-pressed="form.service_name === svc"
              :class="['flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95',
                form.service_name === svc ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-700']"
              :style="form.service_name === svc ? { background: primaryColor } : {}">
              <span :class="['material-icons text-[15px]', form.service_name === svc ? 'text-white' : 'text-slate-300']">
                chevron_right
              </span>
              {{ svc }}
            </button>
          </div>
        </div>

        <div v-if="form.service_name"
          class="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 border"
          :style="{ background: primaryColor + '10', borderColor: primaryColor + '30' }">
          <span class="material-icons text-[18px]" :style="{ color: primaryColor }">check_circle</span>
          <span class="text-sm font-semibold flex-1" :style="{ color: primaryColor }">{{ form.service_name }}</span>
          <button type="button" aria-label="Clear service"
            @click="form.service_name = ''; $emit('update:selectedCategory', null)"
            class="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white transition-colors">
            <span class="material-icons text-[15px]">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 3: Schedule -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-slate-50">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          :style="{ background: primaryColor + '18' }">
          <span class="material-icons text-[15px]" :style="{ color: primaryColor }">calendar_month</span>
        </div>
        <h2 class="text-sm font-bold text-slate-800">Pick a date &amp; time</h2>
        <button type="button" @click="$emit('refresh')" :disabled="availability.loading" aria-label="Refresh availability"
          class="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors">
          <span :class="['material-icons text-[15px]', availability.loading ? 'animate-spin' : '']">refresh</span>
          Live availability
        </button>
      </div>
      <div class="p-5 space-y-5">

        <DateStrip v-model="form.appointment_date" :min="today" :primary-color="primaryColor" />

        <!-- Doctor first: availability depends on who you see -->
        <div v-if="showDoctorSelect && doctors.length > 0">
          <label for="bk-doctor" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Preferred Doctor
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">stethoscope</span>
            <select id="bk-doctor" v-model="form.doctor_id"
              class="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none">
              <option value="">Any available doctor</option>
              <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
          </div>
        </div>

        <div>
          <p class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Time <span class="text-red-400">*</span>
            <span v-if="form.time_slot" class="ml-1 normal-case font-bold" :style="{ color: primaryColor }">
              — {{ form.time_slot }}
            </span>
          </p>

          <div v-if="availability.error"
            class="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-xs text-slate-500">
            <span class="material-icons text-[16px] text-slate-400">cloud_off</span>
            Couldn't check live availability. Times shown may be out of date — we'll confirm when you book.
          </div>

          <TimeSlotPicker
            v-model:selected="form.time_slot"
            :booked="availability.booked"
            :date="form.appointment_date"
            :today="availability.today || today"
            :now-minutes="availability.minutes"
            :loading="availability.loading && !availability.loadedOnce"
            :primary-color="primaryColor"
            @next-day="nextDay"
          />
        </div>

        <div>
          <label for="bk-notes" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Additional Notes
            <span class="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-3.5 material-icons text-slate-400 text-[18px]">notes</span>
            <textarea id="bk-notes" v-model="form.notes" rows="3" maxlength="1000"
              placeholder="Allergies, special concerns, or anything your clinic should know…"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your booking</h3>
      <dl class="space-y-2.5 text-sm">
        <div class="flex items-center gap-3">
          <dt class="material-icons text-slate-300 text-[18px]">event</dt>
          <dd class="font-semibold text-slate-800">{{ formattedDate }}</dd>
        </div>
        <div class="flex items-center gap-3">
          <dt class="material-icons text-slate-300 text-[18px]">schedule</dt>
          <dd :class="form.time_slot ? 'font-semibold text-slate-800' : 'text-slate-300'">
            {{ form.time_slot || 'Choose a time' }}
          </dd>
        </div>
        <div v-if="form.service_name" class="flex items-center gap-3">
          <dt class="material-icons text-slate-300 text-[18px]">medical_services</dt>
          <dd class="text-slate-700">{{ form.service_name }}</dd>
        </div>
        <div v-if="doctorName" class="flex items-center gap-3">
          <dt class="material-icons text-slate-300 text-[18px]">stethoscope</dt>
          <dd class="text-slate-700">{{ doctorName }}</dd>
        </div>
      </dl>
    </div>

    <!-- Notice (e.g. someone just took your time) -->
    <div v-if="notice" role="status" class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <span class="material-icons text-amber-500 text-[18px] mt-0.5 shrink-0">info</span>
      <p class="text-sm text-amber-800">{{ notice }}</p>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" role="alert" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span class="material-icons text-red-500 text-[18px] mt-0.5 shrink-0">error_outline</span>
      <p class="text-sm text-red-600">{{ errorMsg }}</p>
    </div>

    <!-- Submit -->
    <div>
      <button type="button" @click="$emit('book')" :disabled="saving || !canSubmit"
        :style="canSubmit ? { background: primaryColor } : {}"
        class="w-full flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm active:scale-95 shadow-sm">
        <span :class="['material-icons text-[18px]', saving ? 'animate-spin' : '']">{{ saving ? 'autorenew' : 'event_available' }}</span>
        {{ saving ? 'Confirming…' : 'Confirm Appointment' }}
      </button>
      <p v-if="!canSubmit && missing.length" class="text-xs text-slate-400 text-center mt-2">
        Still needed: {{ missing.join(', ') }}
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { ClinicServiceCategory } from '@/types'
import { addDays, formatLongDate, isValidEmail, isValidPhone, type BookingAvailability } from '@/utils/booking'
import DateStrip from './DateStrip.vue'
import TimeSlotPicker from './TimeSlotPicker.vue'

const props = defineProps<{
  form: Record<string, any>
  primaryColor: string
  selectedCategory: ClinicServiceCategory | null
  doctors: { id: string; full_name: string }[]
  showDoctorSelect: boolean
  today: string
  errorMsg: string
  notice: string
  saving: boolean
  canSubmit: boolean
  /** Clinic's own service categories (from clinic_services, or the built-in defaults) */
  categories: ClinicServiceCategory[]
  availability: BookingAvailability
}>()

defineEmits<{
  (e: 'update:selectedCategory', val: ClinicServiceCategory | null): void
  (e: 'book'): void
  (e: 'refresh'): void
}>()

const inputClass =
  'w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all'

// Show a field's error only after the visitor has left it once
const touched = reactive({ name: false, phone: false, email: false })

const nameError = computed(() =>
  touched.name && props.form.full_name.trim().length < 2 ? 'Please enter your full name' : '')
const phoneError = computed(() =>
  touched.phone && !isValidPhone(props.form.contact_number) ? 'Enter a valid phone number, e.g. 0917 123 4567' : '')
const emailError = computed(() =>
  touched.email && props.form.email.trim() && !isValidEmail(props.form.email) ? "That email doesn't look right" : '')

const infoComplete = computed(() =>
  props.form.full_name.trim().length >= 2 && isValidPhone(props.form.contact_number))

const missing = computed(() => {
  const out: string[] = []
  if (props.form.full_name.trim().length < 2) out.push('your name')
  if (!isValidPhone(props.form.contact_number)) out.push('a valid phone number')
  if (props.form.email.trim() && !isValidEmail(props.form.email)) out.push('a valid email')
  if (!props.form.time_slot) out.push('a time')
  return out
})

const formattedDate = computed(() => (props.form.appointment_date ? formatLongDate(props.form.appointment_date) : ''))
const doctorName = computed(() => props.doctors.find(d => d.id === props.form.doctor_id)?.full_name ?? '')

function nextDay() {
  props.form.appointment_date = addDays(props.form.appointment_date, 1)
}
</script>
