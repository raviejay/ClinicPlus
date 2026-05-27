import { supabase } from './supabase'
import type { Clinic, Branch, ApiResponse } from '@/types'

export interface ClinicWithBranches extends Clinic {
  branches: Branch[]
}

export const superadminService = {
  async getAllClinicsWithBranches(): Promise<ApiResponse<ClinicWithBranches[]>> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*, branches(*)')
      .order('created_at', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data as ClinicWithBranches[], error: null }
  },

  async getClinicBranches(clinicId: string): Promise<ApiResponse<Branch[]>> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data ?? [], error: null }
  },
}
