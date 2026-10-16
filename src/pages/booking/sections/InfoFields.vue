<template>
  <div :class="refined ? 'space-y-6' : 'space-y-4'">
    <div v-for="f in fields" :key="f.id">
      <label :for="f.id" :class="labelClass">
        {{ f.label }} <span v-if="f.required" class="text-red-400">*</span>
        <span v-if="f.hint" class="text-slate-300 font-normal normal-case tracking-normal">{{ f.hint }}</span>
      </label>
      <div class="relative">
        <span v-if="!refined" class="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 text-[18px]">{{ f.icon }}</span>
        <input :id="f.id" v-model="ctx.form[f.model]" :type="f.type" :inputmode="f.inputmode" :placeholder="f.placeholder"
          :autocomplete="f.autocomplete" @blur="touched[f.touch] = true"
          :class="[inputClass, errors[f.touch] ? 'border-red-300' : refined ? 'border-stone-300' : 'border-gray-200']" />
      </div>
      <p v-if="errors[f.touch]" class="text-xs text-red-500 mt-1.5">{{ errors[f.touch] }}</p>
      <p v-else-if="f.note" class="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
        <span class="material-icons text-[13px]">info</span>{{ f.note }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { isValidEmail, isValidPhone } from '@/utils/booking'
import { useBooking } from '../bookingContext'

const props = defineProps<{ look?: 'classic' | 'refined' }>()
const ctx = useBooking()
const refined = computed(() => props.look === 'refined')

const labelClass = computed(() =>
  refined.value
    ? 'block text-[11px] font-semibold text-stone-500 mb-1 uppercase tracking-[0.14em]'
    : 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider')

const inputClass = computed(() =>
  refined.value
    ? 'w-full px-0 py-2.5 border-0 border-b bg-transparent text-[15px] text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-stone-800 transition-colors'
    : 'w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all')

interface Field {
  id: string; model: 'full_name' | 'contact_number' | 'email'; touch: 'name' | 'phone' | 'email'
  label: string; required?: boolean; hint?: string; note?: string; icon: string
  type: string; inputmode?: 'tel' | 'email'; placeholder: string; autocomplete: string
}
const fields: Field[] = [
  { id: 'bk-name', model: 'full_name', touch: 'name', label: 'Full Name', required: true, icon: 'badge', type: 'text', placeholder: 'Juan Dela Cruz', autocomplete: 'name' },
  { id: 'bk-phone', model: 'contact_number', touch: 'phone', label: 'Contact Number', required: true, icon: 'phone', type: 'tel', inputmode: 'tel', placeholder: '09XX XXX XXXX', autocomplete: 'tel', note: 'No account needed — the clinic uses this number to find your record.' },
  { id: 'bk-email', model: 'email', touch: 'email', label: 'Email Address', hint: '(optional — for your confirmation)', icon: 'mail_outline', type: 'email', inputmode: 'email', placeholder: 'patient@email.com', autocomplete: 'email' },
]

// Show a field's error only after the visitor has left it once
const touched = reactive({ name: false, phone: false, email: false })

const errors = computed(() => ({
  name: touched.name && ctx.form.full_name.trim().length < 2 ? 'Please enter your full name' : '',
  phone: touched.phone && !isValidPhone(ctx.form.contact_number) ? 'Enter a valid phone number, e.g. 0917 123 4567' : '',
  email: touched.email && ctx.form.email.trim() && !isValidEmail(ctx.form.email) ? "That email doesn't look right" : '',
}))
</script>
