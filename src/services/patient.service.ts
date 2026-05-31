import { supabase } from './supabase'
import type { Patient, ApiResponse, ClinicPlan } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { planRestrictionService } from './planRestriction.service'
import { usageService } from './usage.service'

export const patientService = {
  async findOrCreate(
    clinicId: string,
    data: {
      full_name: string
      contact_number: string
      email?: string
      birthdate?: string
      gender?: string
      address?: string
      branch_id?: string
    },
    options?: { plan?: ClinicPlan; skipLimitCheck?: boolean }
  ): Promise<ApiResponse<Patient>> {
    const { data: existing } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('contact_number', data.contact_number)
      .maybeSingle()

    if (existing) {
      if (data.email && !existing.email) {
        const { data: updated, error } = await supabase
          .from('patients')
          .update({ email: data.email })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) return { data: null, error: error.message }
        return { data: updated, error: null }
      }
      return { data: existing, error: null }
    }

    if (!options?.skipLimitCheck && options?.plan) {
      const limitCheck = await planRestrictionService.checkPatientLimit(clinicId, options.plan)
      if (limitCheck.error) {
        return { data: null, error: limitCheck.error }
      }
      if (!limitCheck.data?.allowed) {
        return {
          data: null,
          error: `Monthly new patient limit reached (${limitCheck.data?.current}/${limitCheck.data?.max}). Upgrade your plan to add more patients this month.`,
        }
      }
    }

    const { data: created, error } = await supabase
      .from('patients')
      .insert({ clinic_id: clinicId, ...data })
      .select()
      .single()

    if (error) return { data: null, error: error.message }

    await usageService.incrementNewPatients(clinicId)
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
