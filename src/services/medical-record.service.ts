import { supabase } from './supabase'
import type { MedicalRecord, ApiResponse } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'

export type MedicalRecordWithDetails = MedicalRecord & {
  patients: { full_name: string; contact_number: string } | null
  profiles: { full_name: string | null } | null
}

export const medicalRecordService = {
  async create(data: {
    clinic_id: string
    patient_id: string
    doctor_id: string
    appointment_id?: string
    branch_id?: string
    diagnosis?: string
    prescription?: string
    notes?: string
    visit_date?: string
  }): Promise<ApiResponse<MedicalRecord>> {
    const { data: record, error } = await supabase
      .from('medical_records')
      .insert({
        ...data,
        visit_date: data.visit_date ?? new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: record, error: null }
  },

  async getByPatient(clinicId: string, patientId: string): Promise<ApiResponse<MedicalRecordWithDetails[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)

    query = buildBranchFilter(query)

    const { data, error } = await query.order('visit_date', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getAll(clinicId: string, filters?: {
    doctorId?: string
    dateFrom?: string
    dateTo?: string
    keyword?: string
  }): Promise<ApiResponse<MedicalRecordWithDetails[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)

    query = buildBranchFilter(query)

    if (filters?.doctorId)  query = query.eq('doctor_id', filters.doctorId)
    if (filters?.dateFrom)  query = query.gte('visit_date', filters.dateFrom)
    if (filters?.dateTo)    query = query.lte('visit_date', filters.dateTo)

    const { data, error } = await query
      .order('visit_date', { ascending: false })
      .limit(200)

    if (error) return { data: null, error: error.message }

    // Client-side keyword filter (diagnosis, prescription, notes, patient name)
    let result = (data as any) ?? []
    if (filters?.keyword) {
      const q = filters.keyword.trim().toLowerCase()
      result = result.filter((r: MedicalRecordWithDetails) =>
        r.patients?.full_name?.toLowerCase().includes(q) ||
        r.patients?.contact_number?.includes(q) ||
        r.diagnosis?.toLowerCase().includes(q) ||
        r.prescription?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      )
    }

    return { data: result, error: null }
  },

  async getById(clinicId: string, recordId: string): Promise<ApiResponse<MedicalRecordWithDetails>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('id', recordId)

    query = buildBranchFilter(query)

    const { data, error } = await query.single()

    if (error) return { data: null, error: error.message }
    return { data: data as any, error: null }
  },

  async update(clinicId: string, recordId: string, updates: Partial<MedicalRecord>): Promise<ApiResponse<MedicalRecord>> {
    const { data, error } = await supabase
      .from('medical_records')
      .update(updates)
      .eq('clinic_id', clinicId)
      .eq('id', recordId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },
}