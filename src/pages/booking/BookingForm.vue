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
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Full Name <span class="text-red-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">badge</span>
            <input v-model="form.full_name" type="text" placeholder="Juan Dela Cruz"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Contact Number <span class="text-red-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">phone</span>
            <input v-model="form.contact_number" type="tel" placeholder="09XXXXXXXXX"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all" />
          </div>
          <p class="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span class="material-icons text-[13px]">info</span>
            No account needed — just your number.
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Email Address
            <span class="text-slate-300 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">mail_outline</span>
            <input v-model="form.email" type="email" placeholder="patient@email.com"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all" />
          </div>
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
      </div>
      <div class="p-5">
        <!-- Category grid -->
        <div v-if="!selectedCategory" class="grid grid-cols-2 gap-2">
          <button v-for="cat in categories" :key="cat.id"
            @click="$emit('update:selectedCategory', cat)"
            class="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-left transition-all active:scale-95">
            <span class="text-2xl">{{ cat.icon }}</span>
            <span class="text-xs font-semibold text-slate-700 leading-tight">{{ cat.label }}</span>
          </button>
        </div>
        <!-- Services within category -->
        <div v-else class="space-y-3">
          <button @click="$emit('update:selectedCategory', null); form.service_name = ''"
            class="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            :style="{ color: primaryColor }">
            <span class="material-icons text-[15px]">arrow_back</span>
            {{ selectedCategory.icon }} {{ selectedCategory.label }}
          </button>
          <div class="grid grid-cols-1 gap-1.5">
            <button v-for="svc in selectedCategory.services" :key="svc"
              @click="form.service_name = svc"
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
        <!-- Selected badge -->
        <div v-if="form.service_name"
          class="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 border"
          :style="{ background: primaryColor + '10', borderColor: primaryColor + '30' }">
          <span class="material-icons text-[18px]" :style="{ color: primaryColor }">check_circle</span>
          <span class="text-sm font-semibold flex-1" :style="{ color: primaryColor }">{{ form.service_name }}</span>
          <button @click="form.service_name = ''; $emit('update:selectedCategory', null)"
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
        <h2 class="text-sm font-bold text-slate-800">Schedule</h2>
      </div>
      <div class="p-5 space-y-5">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Preferred Date <span class="text-red-400">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">event</span>
            <input v-model="form.appointment_date" type="date" :min="today"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Preferred Time
            <span v-if="form.time_slot" class="ml-1 normal-case font-bold" :style="{ color: primaryColor }">
              — {{ form.time_slot }}
            </span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="slot in timeSlots" :key="slot" @click="form.time_slot = slot"
              :class="['py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95',
                form.time_slot === slot ? 'text-white border-transparent' : 'bg-white border-gray-200 text-slate-500']"
              :style="form.time_slot === slot ? { background: primaryColor } : {}">
              {{ slot }}
            </button>
          </div>
        </div>
        <div v-if="showDoctorSelect && doctors.length > 0">
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Preferred Doctor
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">stethoscope</span>
            <select v-model="form.doctor_id"
              class="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none">
              <option value="">Any available doctor</option>
              <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.full_name }}</option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px] pointer-events-none">expand_more</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Additional Notes
            <span class="normal-case font-normal text-slate-400 tracking-normal">(optional)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-3.5 material-icons text-slate-400 text-[18px]">notes</span>
            <textarea v-model="form.notes" rows="3"
              placeholder="Allergies, special concerns, or anything your clinic should know…"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none">
            </textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span class="material-icons text-red-500 text-[18px] mt-0.5 shrink-0">error_outline</span>
      <p class="text-sm text-red-600">{{ errorMsg }}</p>
    </div>

    <!-- Submit -->
    <button @click="$emit('book')" :disabled="saving || !canSubmit"
      :style="canSubmit ? { background: primaryColor } : {}"
      class="w-full flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm active:scale-95 shadow-sm">
      <span class="material-icons text-[18px]">{{ saving ? 'hourglass_empty' : 'event_available' }}</span>
      {{ saving ? 'Confirming…' : 'Confirm Appointment' }}
    </button>

  </div>
</template>

<script setup lang="ts">
import type { ServiceCategory } from '@/types'

defineProps<{
  form: Record<string, any>
  primaryColor: string
  selectedCategory: ServiceCategory | null
  doctors: { id: string; full_name: string }[]
  showDoctorSelect: boolean
  timeSlots: string[]
  today: string
  errorMsg: string
  saving: boolean
  canSubmit: boolean
  categories: ServiceCategory[]
}>()

defineEmits<{
  (e: 'update:selectedCategory', val: ServiceCategory | null): void
  (e: 'book'): void
}>()
</script>