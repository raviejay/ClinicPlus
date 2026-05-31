import { supabase } from './supabase'
import type { Appointment, ApiResponse, Queue } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { notificationService } from './notification.service'
import { queueService } from './queue.service'

async function maybeSendConfirmationEmail(appointmentId: string, status: Appointment['status']) {
  if (status !== 'confirmed') return
  await notificationService.sendAppointmentConfirmation(appointmentId)
}

export const appointmentService = {
  async create(data: {
    clinic_id: string
    branch_id?: string
    patient_id: string
    doctor_id?: string
    appointment_date: string
    time_slot?: string
    service_category?: string
    service_name?: string
    notes?: string
    status?: Appointment['status']
  }): Promise<ApiResponse<Appointment>> {
    const status = data.status ?? 'confirmed'
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({ ...data, status })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    if (appt) await maybeSendConfirmationEmail(appt.id, status)
    return { data: appt, error: null }
  },

  async getAll(clinicId: string, filters?: {
    date?: string
    dateFrom?: string
    dateTo?: string
    status?: string
    doctor_id?: string
  }): Promise<ApiResponse<(Appointment & {
    patients: { full_name: string; contact_number: string } | null
    profiles: { full_name: string | null } | null
  })[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from('appointments')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
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

  async getToday(clinicId: string): Promise<ApiResponse<(Appointment & {
    patients: { full_name: string; contact_number: string } | null
    profiles: { full_name: string | null } | null
  })[]>> {
    const today = new Date().toISOString().split('T')[0]
    return this.getAll(clinicId, { date: today })
  },

  async updateStatus(
    clinicId: string,
    appointmentId: string,
    status: Appointment['status']
  ): Promise<ApiResponse<Appointment>> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('clinic_id', clinicId)
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    if (data) await maybeSendConfirmationEmail(data.id, status)
    return { data, error: null }
  },

  /**
   * Check In a confirmed appointment.
   *
   * Correct status flow:
   *   confirmed → [Check In clicked] → in_queue → [Queue Done] → completed
   *
   * On check-in:
   *   1. Appointment status → 'in_queue'  (NOT completed yet)
   *   2. Queue entry created as 'waiting' with appointment_id linked
   *
   * The appointment only becomes 'completed' when the queue entry is marked done.
   * That final step is handled by QueuePage.vue → markDone() → queue.service.markDoneWithAppointment()
   */
  async checkIn(
    clinicId: string,
    appointment: Appointment
  ): Promise<ApiResponse<Queue>> {
    // Step 1: Mark appointment as in_queue (patient is now physically in the clinic)
    const { error: apptError } = await this.updateStatus(clinicId, appointment.id, 'in_queue')
    if (apptError) {
      return { data: null, error: `Failed to update appointment: ${apptError}` }
    }

    // Step 2: Create queue entry linked to this appointment
    const { data: queueEntry, error: queueError } = await queueService.addToQueue({
      clinic_id: clinicId,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      doctor_id: appointment.doctor_id ?? undefined,
      branch_id: appointment.branch_id ?? undefined,
    })

    if (queueError || !queueEntry) {
      // Roll back appointment status if queue creation failed
      await this.updateStatus(clinicId, appointment.id, 'confirmed')
      return { data: null, error: queueError ?? 'Failed to create queue entry' }
    }

    return { data: queueEntry, error: null }
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

  async createPublic(data: {
    clinic_id: string
    patient_id: string
    appointment_date: string
    time_slot?: string
    doctor_id?: string
    service_category?: string
    service_name?: string
    notes?: string
  }): Promise<ApiResponse<Appointment>> {
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({ ...data, status: 'confirmed' })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    if (appt) await maybeSendConfirmationEmail(appt.id, 'confirmed')
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