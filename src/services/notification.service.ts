import { supabase } from './supabase'
import type { ApiResponse, AppNotification } from '@/types'

export const notificationService = {
  async sendAppointmentConfirmation(appointmentId: string): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      const { data, error } = await supabase.functions.invoke('send-appointment-email', {
        body: { appointment_id: appointmentId },
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as { sent: boolean }, error: null }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to send appointment email',
      }
    }
  },

  // The team's recent alerts, newest first. What each person may see is decided by the database.
  async getRecent(clinicId: string, limit = 30): Promise<ApiResponse<AppNotification[]>> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as AppNotification[], error: null }
  },

  // Everything up to `seenAt` (a server time, taken from the newest alert) counts as read
  async markSeen(userId: string, seenAt: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.from('profiles').update({ notifications_seen_at: seenAt }).eq('id', userId)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },

  /** Calls `onNew` the moment a new alert for this clinic is created. Returns a function that stops listening. */
  subscribe(clinicId: string, onNew: (n: AppNotification) => void): () => void {
    const channel = supabase
      .channel(`notifications:${clinicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `clinic_id=eq.${clinicId}` },
        payload => onNew(payload.new as AppNotification),
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },
}
