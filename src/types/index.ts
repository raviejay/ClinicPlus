// ============================================================
// CLINIC SAAS — TYPES (aligned with project spec)
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'staff'
export type ClinicPlan = 'starter' | 'pro' | 'premium'
export type ClinicStatus = 'active' | 'suspended' | 'cancelled'
export type BookingMode = 'auto_assign' | 'doctor_selection' | 'hybrid'
export type QueueStatus = 'waiting' | 'now_serving' | 'done' | 'skipped'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card' | 'other'
export type PaymentStatus = 'paid' | 'refunded' | 'pending'
export type Gender = 'male' | 'female' | 'other'
export type ClinicLayout = 'layout_a' | 'layout_b' | 'layout_c' | 'layout_d'

export interface Profile {
  id: string
  clinic_id: string | null
  branch_id: string | null
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Clinic {
  id: string
  name: string
  slug: string
  email: string | null
  plan: ClinicPlan
  status: ClinicStatus
  is_trial: boolean
  trial_ends_at: string | null
  created_at: string
}

export interface ClinicSettings {
  clinic_id: string
  booking_mode: BookingMode
  queue_enabled: boolean
  sms_enabled: boolean
  multi_branch_enabled: boolean
}

export interface ClinicBranding {
  clinic_id: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  layout: ClinicLayout
  banner_image: string | null
}

export interface Branch {
  id: string
  clinic_id: string
  name: string
  address: string | null
  contact_number: string | null
  created_at: string
}

export interface Patient {
  id: string
  clinic_id: string
  branch_id: string | null
  full_name: string
  contact_number: string
  birthdate: string | null
  gender: Gender | null
  address: string | null
  created_at: string
}

export interface Appointment {
  id: string
  clinic_id: string
  branch_id: string | null
  patient_id: string
  doctor_id: string | null
  appointment_date: string
  time_slot: string | null
  status: AppointmentStatus
  notes: string | null
  created_at: string
}

export interface Queue {
  id: string
  clinic_id: string
  branch_id: string | null
  patient_id: string
  appointment_id: string | null
  doctor_id: string | null
  priority_number: number
  status: QueueStatus
  queue_date: string
  created_at: string
}

export interface MedicalRecord {
  id: string
  clinic_id: string
  branch_id: string | null
  patient_id: string
  appointment_id: string | null
  doctor_id: string
  diagnosis: string | null
  prescription: string | null
  notes: string | null
  visit_date: string
  created_at: string
}

export interface Payment {
  id: string
  clinic_id: string
  branch_id: string | null
  patient_id: string
  appointment_id: string | null
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  paid_at: string
  created_at: string
}

// Auth
export interface AuthUser {
  id: string
  email: string | null
}

// API
export type ApiResponse<T> = {
  data: T | null
  error: string | null
}

// Payloads
export interface SignupPayload {
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ClinicSetupPayload {
  name: string
  email?: string
}