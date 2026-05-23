import { supabase } from './supabase'
import type { MedicalRecord, ApiResponse } from '@/types'

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
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getAll(clinicId: string): Promise<ApiResponse<MedicalRecordWithDetails[]>> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .order('visit_date', { ascending: false })
      .limit(50)

    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getById(clinicId: string, recordId: string): Promise<ApiResponse<MedicalRecordWithDetails>> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('id', recordId)
      .single()

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