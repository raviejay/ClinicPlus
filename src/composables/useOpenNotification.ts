import { useRouter } from 'vue-router'
import { notificationService } from '@/services/notification.service'
import { scheduleLocation } from '@/utils/notifications'

/** Opens the schedule on the day of the appointment an alert is about, with that appointment highlighted */
export function useOpenNotification() {
  const router = useRouter()
  return async function open(appointmentId: string | null | undefined) {
    const date = appointmentId ? await notificationService.getAppointmentDate(appointmentId) : null
    await router.push(scheduleLocation(appointmentId, date))
  }
}
