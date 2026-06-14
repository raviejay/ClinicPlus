// ============================================================
// CLINIC SAAS — TYPES (aligned with project spec)
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'staff'
export type ClinicPlan = 'starter' | 'pro' | 'premium'
export type ClinicStatus = 'active' | 'suspended' | 'cancelled'
export type BookingMode = 'auto_assign' | 'doctor_selection' | 'hybrid'
export type QueueStatus = 'waiting' | 'now_serving' | 'done' | 'skipped'
/**
 * DB-backed statuses — must match the Postgres CHECK constraint on appointments.status.
 */
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_queue'
  | 'completed'
  | 'cancelled'
  | 'no_show'

/**
 * Extended display-only statuses for UI labels/badges.
 */
export type AppointmentDisplayStatus = AppointmentStatus | 'arrived' | 'checked_in' | 'consulting'

// ──────────────────────────────────────────────────────────
// Clinic-defined service catalog
// Each clinic manages their own list of service categories
// and services via Settings → Services.
// ──────────────────────────────────────────────────────────
export interface ClinicService {
  id: string
  clinic_id: string
  category_id: string
  category_name: string
  category_icon: string
  service_name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

/**
 * A grouped view of ClinicService rows — one entry per category
 * with all services under it.
 */
export interface ClinicServiceCategory {
  id: string        // category_id
  label: string     // category_name
  icon: string      // category_icon
  services: string[] // service_name values
}

// Legacy built-in service categories (used as fallback when a clinic
// has no custom services configured yet).
export interface ServiceCategory {
  id: string
  label: string
  icon: string
  services: string[]
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'consultation',
    label: 'Consultation',
    icon: '🩺',
    services: ['General Check-up', 'Follow-up Consultation', 'New Patient Visit', 'Specialist Consultation', 'Telemedicine / Virtual Visit'],
  },
  {
    id: 'preventive',
    label: 'Preventive Care',
    icon: '🛡️',
    services: ['Routine Physical Exam', 'Vaccination / Immunization', 'Health Screening', 'Annual Wellness Visit', 'Pre-employment Clearance'],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics & Lab',
    icon: '🔬',
    services: ['Blood Test / Lab Work', 'X-Ray', 'Ultrasound', 'ECG / EKG', 'Urinalysis', 'Other Diagnostic Test'],
  },
  {
    id: 'procedure',
    label: 'Procedure / Treatment',
    icon: '⚕️',
    services: ['Minor Procedure', 'Wound Care / Dressing', 'Injection / IV Therapy', 'Physical Therapy', 'Dental Procedure', 'Eye Procedure', 'Other Treatment'],
  },
  {
    id: 'maternal',
    label: 'Maternal & Child Health',
    icon: '👶',
    services: ['Prenatal Check-up', 'Postnatal Visit', 'Newborn Care', 'Child Well-Baby Visit', 'Family Planning'],
  },
  {
    id: 'mental',
    label: 'Mental & Behavioral Health',
    icon: '🧠',
    services: ['Mental Health Consultation', 'Counseling / Therapy', 'Psychiatric Follow-up', 'Stress / Anxiety Management'],
  },
  {
    id: 'emergency',
    label: 'Urgent / Emergency',
    icon: '🚨',
    services: ['Acute Illness Visit', 'Injury / Accident', 'Fever / Pain Management', 'Emergency Consultation'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📋',
    services: ['Medical Certificate', 'Referral Letter', 'Other (please specify in notes)'],
  },
]
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
  status?: ClinicStatus
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

export interface Subscription {
  id: string
  clinic_id: string
  plan: ClinicPlan
  status: 'active' | 'pending' | 'cancelled' | 'expired'
  payment_link_id: string
  reference_number: string
  amount: number
  billing_date: string
  next_billing_date: string
  paymongo_payment_id?: string
  created_at: string
  updated_at: string
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
  email: string | null
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
  service_category: string | null
  service_name: string | null
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