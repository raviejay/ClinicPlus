import { supabase } from './supabase'
import type { Clinic, ClinicSettings, ClinicBranding, ClinicSetupPayload, ApiResponse } from '@/types'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  let attempt = 0
  while (true) {
    const { data } = await supabase
      .from('clinics')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    attempt++
    slug = `${base}-${attempt}`
  }
}

export const clinicService = {
  async createClinic(userId: string, payload: ClinicSetupPayload): Promise<ApiResponse<Clinic>> {
    const baseSlug = generateSlug(payload.name)
    const slug = await ensureUniqueSlug(baseSlug)

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // 1. Create clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name: payload.name,
        slug,
        email: payload.email ?? null,
        plan: 'premium',
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString()
      })
      .select()
      .single()

    if (clinicError) return { data: null, error: clinicError.message }

    // 2. Default settings
    const { error: settingsError } = await supabase
      .from('clinic_settings')
      .insert({
        clinic_id: clinic.id,
        booking_mode: 'auto_assign',
        queue_enabled: false,
        sms_enabled: false,
        multi_branch_enabled: false
      })
    if (settingsError) return { data: null, error: settingsError.message }

    // 3. Default branding
    const { error: brandingError } = await supabase
      .from('clinic_branding')
      .insert({
        clinic_id: clinic.id,
        primary_color: '#2563eb',
        secondary_color: '#1e40af',
        layout: 'layout_a'
      })
    if (brandingError) return { data: null, error: brandingError.message }

    // 4. UPSERT profile → admin of this clinic (handles RLS better)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        clinic_id: clinic.id, 
        role: 'admin',
        full_name: null
      }, {
        onConflict: 'id'
      })
    if (profileError) return { data: null, error: profileError.message }

    // 5. Create initial subscription (14-day PREMIUM trial)
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 14)

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        clinic_id: clinic.id,
        plan: 'premium', // Trial = Premium plan ✓
        status: 'active',
        payment_link_id: `trial-${clinic.id}`,
        reference_number: `TRIAL-${clinic.id}`,
        amount: 199900, // ₱1,999 in cents (premium price)
        billing_date: new Date().toISOString(),
        next_billing_date: nextBillingDate.toISOString()
      })
    if (subscriptionError) return { data: null, error: subscriptionError.message }

    return { data: clinic, error: null }
  },

  async getClinic(clinicId: string): Promise<ApiResponse<Clinic>> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async getAllClinics(): Promise<ApiResponse<Clinic[]>> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async getClinicSettings(clinicId: string): Promise<ApiResponse<ClinicSettings>> {
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async getClinicBranding(clinicId: string): Promise<ApiResponse<ClinicBranding>> {
    const { data, error } = await supabase
      .from('clinic_branding')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  // Used for public booking page — fetches by slug, no auth needed
  async getClinicBySlug(slug: string): Promise<ApiResponse<Clinic & { clinic_branding: ClinicBranding | null, clinic_settings: ClinicSettings | null }>> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*, clinic_branding(*), clinic_settings(*)')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  }
}