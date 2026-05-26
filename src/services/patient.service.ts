import { supabase } from './supabase'
import type { Patient, ApiResponse } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'

export const patientService = {
  async findOrCreate(clinicId: string, data: {
    full_name: string
    contact_number: string
    birthdate?: string
    gender?: string
    address?: string
    branch_id?: string
  }): Promise<ApiResponse<Patient>> {
    // Try to find existing patient by contact number in this clinic
    const { data: existing } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('contact_number', data.contact_number)
      .maybeSingle()

    if (existing) return { data: existing, error: null }

    // Create new patient
    const { data: created, error } = await supabase
      .from('patients')
      .insert({ clinic_id: clinicId, ...data })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: created, error: null }
  },

  async getAll(clinicId: string): Promise<ApiResponse<Patient[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)

    query = buildBranchFilter(query)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data ?? [], error: null }
  },

  async getById(clinicId: string, patientId: string): Promise<ApiResponse<Patient>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('id', patientId)

    query = buildBranchFilter(query)

    const { data, error } = await query.single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async search(clinicId: string, query: string): Promise<ApiResponse<Patient[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let q = supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`full_name.ilike.%${query}%,contact_number.ilike.%${query}%`)

    q = buildBranchFilter(q)

    const { data, error } = await q.order('full_name').limit(20)

    if (error) return { data: null, error: error.message }
    return { data: data ?? [], error: null }
  },

  async update(clinicId: string, patientId: string, updates: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('clinic_id', clinicId)
      .eq('id', patientId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async getCount(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)

    query = buildBranchFilter(query)

    const { count } = await query
    return count ?? 0
  },
}