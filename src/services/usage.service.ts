import { supabase } from './supabase'
import type { ApiResponse } from '@/types'

export interface ClinicMonthlyUsage {
  clinic_id: string
  new_patients_count: number
  period_start: string
}

function currentMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export const usageService = {
  async getMonthlyUsage(clinicId: string): Promise<ApiResponse<ClinicMonthlyUsage>> {
    const monthStart = currentMonthStart()

    const { data: existing, error: fetchError } = await supabase
      .from('clinic_monthly_usage')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (fetchError) {
      return { data: null, error: fetchError.message }
    }

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from('clinic_monthly_usage')
        .insert({ clinic_id: clinicId, new_patients_count: 0, period_start: monthStart })
        .select()
        .single()

      if (insertError) {
        return { data: null, error: insertError.message }
      }
      return { data: created, error: null }
    }

    if (existing.period_start < monthStart) {
      const { data: reset, error: resetError } = await supabase
        .from('clinic_monthly_usage')
        .update({ new_patients_count: 0, period_start: monthStart })
        .eq('clinic_id', clinicId)
        .select()
        .single()

      if (resetError) {
        return { data: null, error: resetError.message }
      }
      return { data: reset, error: null }
    }

    return { data: existing, error: null }
  },

  async incrementNewPatients(clinicId: string): Promise<ApiResponse<ClinicMonthlyUsage>> {
    const usageResult = await this.getMonthlyUsage(clinicId)
    if (usageResult.error || !usageResult.data) {
      return { data: null, error: usageResult.error ?? 'Failed to load usage' }
    }

    const { data, error } = await supabase
      .from('clinic_monthly_usage')
      .update({ new_patients_count: usageResult.data.new_patients_count + 1 })
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }
    return { data, error: null }
  },
}
