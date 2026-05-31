import { supabase } from './supabase'
import type { Queue, ApiResponse } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'

export type QueueWithPatient = Queue & {
  patients: { full_name: string; contact_number: string } | null
  profiles: { full_name: string | null } | null
  // appointment_id is on Queue already; this gives us the linked appt for status sync
  appointment_id?: string | null
}

export const queueService = {
  async getTodayQueue(clinicId: string, doctorId?: string): Promise<ApiResponse<QueueWithPatient[]>> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('queue')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)

    query = buildBranchFilter(query)
    if (doctorId) query = query.eq('doctor_id', doctorId)

    const { data, error } = await query.order('priority_number', { ascending: true })
    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getNextNumber(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('queue')
      .select('priority_number')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)

    query = buildBranchFilter(query)

    const { data } = await query
      .order('priority_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (data?.priority_number ?? 0) + 1
  },

  async addToQueue(data: {
    clinic_id: string
    patient_id: string
    appointment_id?: string
    doctor_id?: string
    branch_id?: string
  }): Promise<ApiResponse<Queue>> {
    const priority_number = await this.getNextNumber(data.clinic_id)
    const today = new Date().toISOString().split('T')[0]

    const { data: queue, error } = await supabase
      .from('queue')
      .insert({
        ...data,
        priority_number,
        status: 'waiting',
        queue_date: today,
      })
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .single()

    if (error) return { data: null, error: error.message }
    return { data: queue as QueueWithPatient, error: null }
  },

  async updateStatus(
    clinicId: string,
    queueId: string,
    status: Queue['status'],
    doctorId?: string
  ): Promise<ApiResponse<Queue>> {
    const updates: Record<string, unknown> = { status }
    if (doctorId) updates.doctor_id = doctorId

    const { data, error } = await supabase
      .from('queue')
      .update(updates)
      .eq('clinic_id', clinicId)
      .eq('id', queueId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  /**
   * Mark a queue entry as done AND sync the linked appointment to 'completed'.
   *
   * This is the correct end of the flow:
   *   Queue: now_serving → done
   *   Appointment (if linked): in_queue → completed
   *
   * Always use this instead of updateStatus(id, 'done') so appointment
   * status stays in sync.
   */
  async markDoneWithAppointment(
    clinicId: string,
    queueItem: QueueWithPatient
  ): Promise<ApiResponse<Queue>> {
    // 1. Mark queue as done
    const { data, error } = await this.updateStatus(clinicId, queueItem.id, 'done')
    if (error) return { data: null, error }

    // 2. If this queue entry came from a check-in, complete the appointment too
    if (queueItem.appointment_id) {
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('clinic_id', clinicId)
        .eq('id', queueItem.appointment_id)
    }

    return { data, error: null }
  },

  async callNext(clinicId: string, doctorId?: string): Promise<ApiResponse<Queue>> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('queue')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)
      .eq('status', 'waiting')

    query = buildBranchFilter(query)

    const { data: next } = await query
      .order('priority_number', { ascending: true })
      .limit(1)

    if (!next?.length) return { data: null, error: 'No patients waiting' }

    return this.updateStatus(clinicId, next[0].id, 'now_serving', doctorId)
  },

  async getTodayCount(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)

    query = buildBranchFilter(query)
    const { count } = await query
    return count ?? 0
  },

  async getWaitingCount(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter()
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)
      .eq('status', 'waiting')

    query = buildBranchFilter(query)
    const { count } = await query
    return count ?? 0
  },

  subscribeToQueue(clinicId: string, callback: () => void) {
    const today = new Date().toISOString().split('T')[0]
    return supabase
      .channel(`queue:${clinicId}:${today}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue',
        filter: `clinic_id=eq.${clinicId}`,
      }, callback)
      .subscribe()
  },
}