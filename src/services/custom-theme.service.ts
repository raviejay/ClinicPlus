import { supabase } from './supabase'
import type { ApiResponse } from '@/types'
import type { ThemeRequestStatus } from '@/utils/branding'

export interface CustomThemeRequest {
  id: string
  clinic_id: string
  contact_email: string
  message: string
  reference_url: string | null
  status: ThemeRequestStatus
  created_at: string
}

export const customThemeService = {
  // The request is saved and emailed to the ClinicGo team by the request-custom-theme
  // Edge Function (it checks the caller is a Premium clinic admin).
  async submit(payload: {
    message: string
    contact_email: string
    reference_url?: string
  }): Promise<ApiResponse<{ id: string; status: ThemeRequestStatus; created_at: string }>> {
    const { data, error } = await supabase.functions.invoke('request-custom-theme', { body: payload })

    if (error) {
      // Surface the function's own message when it returned one
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
      return { data: null, error: body?.error ?? error.message }
    }
    if (data?.error) return { data: null, error: data.error }
    return { data, error: null }
  },

  async list(clinicId: string): Promise<ApiResponse<CustomThemeRequest[]>> {
    const { data, error } = await supabase
      .from('custom_theme_requests')
      .select('id, clinic_id, contact_email, message, reference_url, status, created_at')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as CustomThemeRequest[], error: null }
  },
}
