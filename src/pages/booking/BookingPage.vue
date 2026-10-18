<template>
  <div class="min-h-screen flex flex-col" :style="brandStyle">

    <!-- Preview of unsaved branding (opened from Branding & Themes) -->
    <div v-if="isPreview"
      class="sticky top-0 z-50 bg-slate-900 text-white text-xs font-semibold text-center px-4 py-2 flex items-center justify-center gap-2">
      <span class="material-icons text-[15px]">visibility</span>
      Preview of your unsaved branding — booking is turned off here.
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400 font-medium">Loading clinic…</p>
      </div>
    </div>

    <!-- Clinic not found -->
    <div v-else-if="!clinic" class="flex-1 flex items-center justify-center p-6 text-center">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full">
        <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="material-icons text-slate-400 text-3xl">local_hospital</span>
        </div>
        <h1 class="text-lg font-bold text-slate-900 mb-2">Clinic not found</h1>
        <p class="text-sm text-slate-400">This booking page doesn't exist or has been disabled.</p>
      </div>
    </div>

    <!-- Success screen -->
    <div v-else-if="submitted" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          :style="{ background: primaryColor + '18' }">
          <span class="material-icons text-3xl" :style="{ color: primaryColor }">check_circle</span>
        </div>
        <h2 class="text-2xl font-black text-slate-900 mb-1">All set!</h2>
        <p class="text-sm text-slate-500 mb-4">Your appointment has been confirmed.</p>

        <div v-if="reference" class="inline-flex flex-col items-center bg-slate-50 border border-dashed border-gray-300 rounded-xl px-5 py-2.5 mb-5">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking reference</span>
          <span class="font-mono text-lg font-black tracking-[0.2em] text-slate-800">{{ reference }}</span>
        </div>

        <div class="bg-slate-50 border border-gray-200 rounded-xl px-4 py-4 text-left space-y-2.5 mb-5">
          <div class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">person</span>
            <span class="text-sm font-semibold text-slate-800">{{ form.full_name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">event</span>
            <span class="text-sm text-slate-700">{{ formatLongDate(form.appointment_date) }}</span>
          </div>
          <div v-if="form.time_slot" class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">schedule</span>
            <span class="text-sm text-slate-700">{{ form.time_slot }}</span>
          </div>
          <div v-if="form.service_name" class="flex items-center gap-3">
            <span class="material-icons text-slate-400 text-[18px]">medical_services</span>
            <span class="text-sm text-slate-700">{{ form.service_name }}</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="material-icons text-slate-400 text-[18px]">store</span>
            <span class="text-sm text-slate-700">
              {{ clinic.name }}<template v-if="branch"> — {{ branch.name }}</template>
              <span v-if="branch?.address" class="block text-xs text-slate-400">{{ branch.address }}</span>
              <span v-if="branch?.contact_number" class="block text-xs text-slate-400">{{ branch.contact_number }}</span>
            </span>
          </div>
        </div>

        <p v-if="form.email.trim() && emailsEnabled" class="text-xs text-slate-400 mb-4">
          A confirmation is being sent to {{ form.email.trim() }}.
        </p>
        <p class="text-xs text-slate-400 mb-5">Please arrive a few minutes early. Quote your reference if you need to contact the clinic.</p>

        <div class="space-y-2">
          <button @click="addToCalendar"
            class="w-full text-white text-sm font-bold py-3 rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            :style="{ background: primaryColor }">
            <span class="material-icons text-[16px]">edit_calendar</span>
            Add to calendar
          </button>
          <button @click="resetForm"
            class="w-full border border-gray-200 text-slate-600 text-sm font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
            <span class="material-icons text-[16px]">add_circle_outline</span>
            Book another appointment
          </button>
        </div>
      </div>
    </div>

    <!-- The chosen layout; the page keeps all the logic, layouts only arrange it -->
    <component :is="layoutComponent" v-else />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { clinicService } from '@/services/clinic.service'
import { clinicServicesService } from '@/services/clinic-services.service'
import { appointmentService } from '@/services/appointment.service'
import { branchService } from '@/services/branch.service'
import type { Clinic, ClinicSettings, ClinicBranding, ClinicPlan, Branch, ClinicServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'
import {
  type BookingAvailability, bookingReference, buildIcs, downloadTextFile, formatLongDate,
  bookingLocation, isValidEmail, isValidPhone, manilaToday, slotMinutes,
} from '@/utils/booking'
import { firstOpenDay, hoursSummary, isOpenOn, normalizeBookingHours, slotsFor } from '@/utils/bookingHours'
import { provideBooking, type BookingCtx } from './bookingContext'
import ClassicLayout from './layouts/ClassicLayout.vue'
import CardsLayout from './layouts/CardsLayout.vue'
import ShowcaseLayout from './layouts/ShowcaseLayout.vue'

const route = useRoute()
// /book/:clinicSlug/:branchSlug?
const clinicSlug = route.params.clinicSlug as string
const branchSlug = route.params.branchSlug as string | undefined

const loading = ref(true)
const saving = ref(false)
const submitted = ref(false)
const errorMsg = ref('')
// Friendly, non-error messages (e.g. "that time was just taken")
const notice = ref('')

const clinic = ref<Clinic | null>(null)
const settings = ref<ClinicSettings | null>(null)
const branding = ref<ClinicBranding | null>(null)
// resolved branch — null means main clinic (no branch)
const branch = ref<Branch | null>(null)
const doctors = ref<{ id: string; full_name: string }[]>([])
const clinicPlan = ref<ClinicPlan>('starter')
const isTrialActive = ref(false)

const selectedCategory = ref<ClinicServiceCategory | null>(null)
// The clinic's own services if it set any up in Settings; otherwise the built-in defaults
const categories = ref<ClinicServiceCategory[]>(SERVICE_CATEGORIES)
const bookedAppointmentId = ref('')
const reference = computed(() => (bookedAppointmentId.value ? bookingReference(bookedAppointmentId.value) : ''))

// 0 = your info, 1 = service, 2 = schedule
const currentStep = computed(() => {
  if (!isValidPhone(form.value.contact_number) || form.value.full_name.trim().length < 2) return 0
  if (!form.value.service_name && categories.value.length > 0 && !form.value.time_slot) return 1
  return 2
})

// Philippine date, whatever the visitor's device clock/time zone says
const today = manilaToday()

// The clinic's own opening days and hours (Settings > Booking hours)
const hours = computed(() => normalizeBookingHours(settings.value?.booking_hours))
const openingHours = computed(() => hoursSummary(hours.value))
const slots = computed(() => slotsFor(hours.value, form.value.appointment_date))
const isClosed = (iso: string) => !isOpenOn(hours.value, iso)
const form = ref({
  full_name: '',
  contact_number: '',
  email: '',
  appointment_date: today,
  time_slot: '',
  doctor_id: '',
  service_name: '',
  service_category: '',
  notes: '',
})

// ?preview=layout_b&primary=%23rrggbb&secondary=%23rrggbb shows unsaved branding choices.
// It only changes how this page renders for whoever opens the link; booking is disabled in preview.
const PREVIEW_LAYOUTS = ['layout_a', 'layout_b', 'layout_c']
const queryText = (value: unknown) => (typeof value === 'string' ? value : '')
const previewLayout = computed(() => {
  const v = queryText(route.query.preview)
  return PREVIEW_LAYOUTS.includes(v) ? v : null
})
const previewColor = (value: unknown) => (/^#[0-9a-f]{6}$/i.test(queryText(value)) ? queryText(value) : null)
const isPreview = computed(() => previewLayout.value !== null)

const primaryColor = computed(
  () => (isPreview.value ? previewColor(route.query.primary) : null) ?? branding.value?.primary_color ?? '#0EA5E9',
)
const secondaryColor = computed(
  () => (isPreview.value ? previewColor(route.query.secondary) : null) ?? branding.value?.secondary_color ?? '#0369A1',
)

const effectivePlan = computed((): ClinicPlan => {
  if (!clinic.value) return 'starter'
  return isTrialActive.value ? 'premium' : clinicPlan.value
})

const emailsEnabled = computed(() => effectivePlan.value !== 'starter')

const activeLayout = computed(() => {
  if (previewLayout.value) return previewLayout.value
  const layout = branding.value?.layout ?? 'layout_a'
  // 'layout_d' (custom theme) is built by our team on request; until one is installed it shows the classic layout
  if (layout === 'layout_d') return 'layout_a'
  if ((layout === 'layout_b' || layout === 'layout_c') && effectivePlan.value === 'starter') return 'layout_a'
  return layout
})

const showDoctorSelect = computed(() =>
  (effectivePlan.value === 'pro' || effectivePlan.value === 'premium') &&
  settings.value?.booking_mode !== 'auto_assign'
)

const canSubmit = computed(() =>
  !isPreview.value &&
  form.value.full_name.trim().length >= 2 &&
  isValidPhone(form.value.contact_number) &&
  (!form.value.email.trim() || isValidEmail(form.value.email)) &&
  Boolean(form.value.appointment_date && form.value.time_slot) &&
  slots.value.some(s => s.label === form.value.time_slot)
)

const brandStyle = computed(() => ({
  background: primaryColor.value
    ? `linear-gradient(150deg, ${primaryColor.value}10 0%, #f8fafc 50%)`
    : '#f8fafc',
}))

// ── Live availability ──────────────────────────────────────────
const availability = ref<BookingAvailability>({
  booked: [], today: '', minutes: 0, loading: false, loadedOnce: false, error: false,
})
let availabilityRequest = 0

function selectedDoctorId() {
  return showDoctorSelect.value && form.value.doctor_id ? form.value.doctor_id : undefined
}

async function loadAvailability(silent = false) {
  if (!clinic.value || !form.value.appointment_date) return
  const request = ++availabilityRequest
  if (!silent) availability.value.loading = true

  const { data, error } = await appointmentService.getPublicAvailability({
    clinic_id: clinic.value.id,
    date: form.value.appointment_date,
    doctor_id: selectedDoctorId(),
    branch_id: branch.value?.id,
  })
  if (request !== availabilityRequest) return // a newer request superseded this one

  if (error || !data) {
    // Keep what we last knew; the server still checks when booking
    availability.value = { ...availability.value, loading: false, error: true }
    return
  }

  availability.value = {
    booked: data.booked, today: data.today, minutes: data.minutes,
    loading: false, loadedOnce: true, error: false,
  }

  // The time they picked may have been taken (or passed) while they were filling in the form
  const slot = form.value.time_slot
  if (slot) {
    const mins = slotMinutes(slot)
    const passed = form.value.appointment_date === data.today && mins !== null && mins <= data.minutes
    if (data.booked.includes(slot) || passed) {
      form.value.time_slot = ''
      notice.value = `${slot} is no longer available. Please pick another time.`
    }
  }
}

// A different date or doctor means a different set of free times
watch(() => [form.value.appointment_date, form.value.doctor_id], () => {
  availability.value = { ...availability.value, booked: [], loadedOnce: false }
  loadAvailability()
})
// A time that the new date does not offer (another day, or a closed one) is cleared
watch(() => form.value.appointment_date, () => {
  if (form.value.time_slot && !slots.value.some(s => s.label === form.value.time_slot)) form.value.time_slot = ''
})
// Picking a time dismisses the notice; clearing it programmatically (stale time) must not
watch(() => form.value.time_slot, slot => { if (slot) notice.value = '' })

// Keep the list fresh while the page is open (other patients may book meanwhile)
let pollTimer: number | undefined
function refreshIfVisible() {
  if (!document.hidden && clinic.value && !submitted.value) loadAvailability(true)
}

function resetForm() {
  submitted.value = false
  selectedCategory.value = null
  bookedAppointmentId.value = ''
  errorMsg.value = ''
  notice.value = ''
  form.value = {
    full_name: '', contact_number: '', email: '',
    appointment_date: firstOpenDay(hours.value, today) ?? today, time_slot: '',
    doctor_id: '', service_name: '', service_category: '', notes: '',
  }
  loadAvailability()
}

function getEffectivePlan(c: Clinic): ClinicPlan {
  if (c.is_trial && c.trial_ends_at && new Date(c.trial_ends_at) > new Date()) return 'premium'
  return c.plan
}

async function handleBooking() {
  if (!clinic.value || !canSubmit.value) return
  saving.value = true
  errorMsg.value = ''
  notice.value = ''

  // One server call: finds/creates the patient, checks plan limits and the slot, creates the appointment
  const { data: booking, error: apptError } = await appointmentService.bookPublic({
    clinic_id: clinic.value.id,
    branch_id: branch.value?.id ?? undefined,
    full_name: form.value.full_name,
    contact_number: form.value.contact_number,
    email: form.value.email.trim() || undefined,
    appointment_date: form.value.appointment_date,
    time_slot: form.value.time_slot || undefined,
    doctor_id: selectedDoctorId(),
    service_category: selectedCategory.value?.id || undefined,
    service_name: form.value.service_name || undefined,
    notes: form.value.notes || undefined,
  })

  saving.value = false
  if (apptError || !booking) {
    if (/already taken|already passed/i.test(apptError ?? '')) {
      // Someone got there first: refresh the grid and let them choose again
      form.value.time_slot = ''
      notice.value = /passed/i.test(apptError ?? '')
        ? 'That time has just passed. Please pick a later time.'
        : 'Sorry — someone just booked that time. Please pick another.'
      await loadAvailability()
    } else {
      errorMsg.value = apptError ?? 'Something went wrong. Please try again.'
    }
    return
  }

  bookedAppointmentId.value = booking.appointment_id
  submitted.value = true
}

function addToCalendar() {
  if (!clinic.value || !form.value.time_slot) return
  const where = [clinic.value.name, branch.value?.name, branch.value?.address].filter(Boolean).join(', ')
  const ics = buildIcs({
    uid: bookedAppointmentId.value || `${Date.now()}`,
    title: `${form.value.service_name || 'Appointment'} — ${clinic.value.name}`,
    description: reference.value ? `Booking reference: ${reference.value}` : 'Appointment booking',
    location: where,
    date: form.value.appointment_date,
    slot: form.value.time_slot,
  })
  downloadTextFile('appointment.ics', ics)
}

const layoutComponent = computed(() =>
  activeLayout.value === 'layout_b' ? CardsLayout : activeLayout.value === 'layout_c' ? ShowcaseLayout : ClassicLayout)

const location = computed(() => bookingLocation(clinic.value ?? { name: '' }, branch.value))

const missing = computed(() => {
  const out: string[] = []
  if (form.value.full_name.trim().length < 2) out.push('your name')
  if (!isValidPhone(form.value.contact_number)) out.push('a valid phone number')
  if (form.value.email.trim() && !isValidEmail(form.value.email)) out.push('a valid email')
  if (!form.value.time_slot) out.push('a time')
  return out
})

// Layouts read everything through this; refs unwrap because the object is reactive
provideBooking(reactive({
  clinic, branch, location, openingHours, hours, slots, isClosed, form, primaryColor, secondaryColor,
  logoUrl: computed(() => branding.value?.logo_url ?? null),
  categories, selectedCategory, doctors, showDoctorSelect, today, availability,
  errorMsg, notice, saving, canSubmit, missing, currentStep,
  setCategory: (category: ClinicServiceCategory | null) => { selectedCategory.value = category },
  refreshAvailability: () => loadAvailability(true),
  book: handleBooking,
}) as unknown as BookingCtx)

onMounted(async () => {
  // Use clinicSlug (not old "slug") to load the clinic
  const { data } = await clinicService.getClinicBySlug(clinicSlug)
  if (data) {
    clinic.value = data
    settings.value = (data as any).clinic_settings ?? null
    branding.value = (data as any).clinic_branding ?? null
    clinicPlan.value = data.plan
    isTrialActive.value = !!(data.is_trial && data.trial_ends_at && new Date(data.trial_ends_at) > new Date())

    // If a branch slug was in the URL, resolve it to a real branch row
    if (branchSlug) {
      const { data: branchData } = await branchService.getPublicBySlug(data.id, branchSlug)
      branch.value = branchData ?? null
    }

    const ep = getEffectivePlan(data)
    const [servicesRes, doctorList] = await Promise.all([
      clinicServicesService.getCategories(data.id),
      (ep === 'pro' || ep === 'premium') && settings.value?.booking_mode !== 'auto_assign'
        ? appointmentService.getPublicDoctors(data.id)
        : Promise.resolve([] as { id: string; full_name: string }[]),
    ])
    if (servicesRes.data && servicesRes.data.length > 0) categories.value = servicesRes.data
    doctors.value = doctorList

    // Start on the first day the clinic is open (today may be a closed day)
    const start = firstOpenDay(hours.value, today)
    if (start && start !== form.value.appointment_date) form.value.appointment_date = start
    else loadAvailability()
    pollTimer = window.setInterval(refreshIfVisible, 20_000)
    document.addEventListener('visibilitychange', refreshIfVisible)
  }
  loading.value = false
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', refreshIfVisible)
})
</script>
