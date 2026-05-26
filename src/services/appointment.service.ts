import { supabase } from './supabase'
import type { Appointment, ApiResponse } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'

export const appointmentService = {
  async create(data: {
    clinic_id: string
    branch_id?: string
    patient_id: string
    doctor_id?: string
    appointment_date: string
    time_slot?: string
    notes?: string
  }): Promise<ApiResponse<Appointment>> {
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({ ...data, status: 'pending' })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: appt, error: null }
  },

  async getAll(clinicId: string, filters?: {
    date?: string
    dateFrom?: string
    dateTo?: string
    status?: string
    doctor_id?: string
  }): Promise<ApiResponse<(Appointment & { patients: { full_name: string; contact_number: string } | null })[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('appointments')
      .select('*, patients(full_name, contact_number)')
      .eq('clinic_id', clinicId)

    query = buildBranchFilter(query)

    if (filters?.date)      query = query.eq('appointment_date', filters.date)
    if (filters?.dateFrom)  query = query.gte('appointment_date', filters.dateFrom)
    if (filters?.dateTo)    query = query.lte('appointment_date', filters.dateTo)
    if (filters?.status)    query = query.eq('status', filters.status)
    if (filters?.doctor_id) query = query.eq('doctor_id', filters.doctor_id)

    const { data, error } = await query
      .order('appointment_date', { ascending: true })
      .order('time_slot', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getToday(clinicId: string): Promise<ApiResponse<Appointment[]>> {
    const today = new Date().toISOString().split('T')[0]
    return this.getAll(clinicId, { date: today })
  },

  async updateStatus(clinicId: string, appointmentId: string, status: Appointment['status']): Promise<ApiResponse<Appointment>> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('clinic_id', clinicId)
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  async getTodayCount(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)

    query = buildBranchFilter(query)

    const { count } = await query
    return count ?? 0
  },

  // For public booking — no auth needed
  async createPublic(data: {
    clinic_id: string
    patient_id: string
    appointment_date: string
    time_slot?: string
    doctor_id?: string
    notes?: string
  }): Promise<ApiResponse<Appointment>> {
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({ ...data, status: 'pending' })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: appt, error: null }
  },

  async getDoctors(clinicId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('clinic_id', clinicId)
      .eq('role', 'doctor')

    if (error) return []
    return data ?? []
  },
}