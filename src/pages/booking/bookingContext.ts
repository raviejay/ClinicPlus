// Everything the booking page knows, shared with whichever layout is showing.
// The page owns the logic (loading, availability, booking); layouts only arrange the sections.

import { inject, provide, type InjectionKey } from 'vue'
import type { BookingAvailability, LocationInfo } from '@/utils/booking'
import type { Branch, Clinic, ClinicServiceCategory } from '@/types'

export interface BookingFormState {
  full_name: string
  contact_number: string
  email: string
  appointment_date: string
  time_slot: string
  doctor_id: string
  service_name: string
  service_category: string
  notes: string
}

export interface BookingCtx {
  clinic: Clinic
  branch: Branch | null
  location: LocationInfo
  /** "8:00 AM – 5:00 PM" */
  openingHours: string
  form: BookingFormState
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  categories: ClinicServiceCategory[]
  selectedCategory: ClinicServiceCategory | null
  doctors: { id: string; full_name: string }[]
  showDoctorSelect: boolean
  /** Today in Manila, YYYY-MM-DD */
  today: string
  availability: BookingAvailability
  errorMsg: string
  notice: string
  saving: boolean
  canSubmit: boolean
  /** What is still missing before the visitor can confirm, e.g. ["your name", "a time"] */
  missing: string[]
  /** 0 = your info, 1 = service, 2 = schedule (for progress indicators) */
  currentStep: number
  setCategory(category: ClinicServiceCategory | null): void
  refreshAvailability(): void
  book(): void
}

const KEY: InjectionKey<BookingCtx> = Symbol('booking')

export const provideBooking = (ctx: BookingCtx) => provide(KEY, ctx)

export function useBooking(): BookingCtx {
  const ctx = inject(KEY)
  if (!ctx) throw new Error('useBooking() must be used inside the booking page')
  return ctx
}
