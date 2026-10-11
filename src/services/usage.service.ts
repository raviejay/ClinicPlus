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
  // Read-only: a database trigger counts every new patient and resets the counter
  // each month, so a stale row (or none at all) simply means zero this month.
  async getMonthlyUsage(clinicId: string): Promise<ApiResponse<ClinicMonthlyUsage>> {
    const monthStart = currentMonthStart()

    const { data, error } = await supabase
      .from('clinic_monthly_usage')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (error) return { data: null, error: error.message }

    if (!data || data.period_start < monthStart) {
      return {
        data: { clinic_id: clinicId, new_patients_count: 0, period_start: monthStart },
        error: null,
      }
    }
    return { data, error: null }
  },
}
