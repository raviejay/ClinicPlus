// Everything the booking page knows, shared with whichever layout is showing.
// The page owns the logic (loading, availability, booking); layouts only arrange the sections.

import { inject, provide, type InjectionKey } from 'vue'
import type { BookingAvailability, LocationInfo } from '@/utils/booking'
import type { BookingHours, Slot } from '@/utils/bookingHours'
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
  /** "Mon–Sat 8:00 AM – 5:00 PM" */
  openingHours: string
  /** The clinic's booking hours (Settings) */
  hours: BookingHours
  /** The times offered on the chosen date (empty when the clinic is closed) */
  slots: Slot[]
  /** True for a date the clinic takes no bookings */
  isClosed(iso: string): boolean
  /** A saved time like '9:00 AM' as people read it on the chosen date: '9:00 – 9:30 AM' */
  timeRange(label: string): string
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
