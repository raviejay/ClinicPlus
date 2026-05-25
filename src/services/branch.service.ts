import { supabase } from './supabase'
import type { Branch, ApiResponse } from '@/types'

export const branchService = {
  async getAll(clinicId: string): Promise<ApiResponse<Branch[]>> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data ?? [], error: null }
  },

  async create(clinicId: string, payload: {
    name: string
    address?: string
    contact_number?: string
  }): Promise<ApiResponse<Branch>> {
    const { data, error } = await supabase
      .from('branches')
      .insert({ clinic_id: clinicId, ...payload })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async update(clinicId: string, branchId: string, payload: {
    name?: string
    address?: string
    contact_number?: string
  }): Promise<ApiResponse<Branch>> {
    const { data, error } = await supabase
      .from('branches')
      .update(payload)
      .eq('clinic_id', clinicId)
      .eq('id', branchId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async remove(clinicId: string, branchId: string): Promise<ApiResponse<null>> {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('id', branchId)

    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}