import { supabase } from './supabase'
import type { ApiResponse } from '@/types'

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
}
