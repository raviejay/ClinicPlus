import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { notificationService } from '@/services/notification.service'
import { mergeNotifications, unreadOf } from '@/utils/notifications'
import type { AppNotification } from '@/types'

const SOUND_KEY = 'clinicgo-alert-sound'

function readSoundPref(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

/** What a failed load most likely means, in words a clinic owner can act on */
export function explainProblem(error: string): string {
  if (/does not exist|schema cache|not find the table/i.test(error)) {
    return 'Notifications are not set up in the database yet. Run the latest Supabase migration (notifications).'
  }
  if (/permission denied|row-level security/i.test(error)) return 'The database refused to share notifications with this account.'
  return `Could not load notifications: ${error}`
}

export interface Toast { id: string; title: string; body: string; appointmentId: string | null }

// One listener for the whole signed-in session (pages come and go, the alerts keep arriving)
export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const seenAt = ref<string | null>(null)
  const toasts = ref<Toast[]>([])
  // Why the list could not be loaded (shown in the bell), or '' when all is well
  const problem = ref('')
  const soundOn = ref(readSoundPref())
  const desktopPermission = ref<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  const unread = computed(() => unreadOf(items.value, seenAt.value))
  const unreadCount = computed(() => unread.value.length)

  let startedFor = ''
  let userId = ''
  let clinicId = ''
  let stopListening: (() => void) | null = null
  let audio: AudioContext | null = null

  async function refresh() {
    if (!clinicId) return
    const { data, error } = await notificationService.getRecent(clinicId)
    if (data) {
      items.value = mergeNotifications(items.value, data)
      problem.value = ''
    } else if (error) {
      console.warn('[notifications] could not load:', error)
      problem.value = explainProblem(error)
    }
  }

  function ding() {
    if (!soundOn.value) return
    try {
      audio ??= new AudioContext()
      const ctx = audio
      ;[659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.connect(gain)
        gain.connect(ctx.destination)
        const at = ctx.currentTime + i * 0.16
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(0.25, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.4)
        osc.start(at)
        osc.stop(at + 0.4)
      })
    } catch { /* browsers block sound until the page has been used: not worth an error */ }
  }

  function showToast(n: AppNotification) {
    toasts.value = [...toasts.value, { id: n.id, title: n.title, body: n.body, appointmentId: n.appointment_id }].slice(-3)
    window.setTimeout(() => dismissToast(n.id), 8000)
  }

  function desktopAlert(n: AppNotification) {
    if (desktopPermission.value !== 'granted' || !document.hidden) return
    try { new Notification(n.title, { body: n.body, tag: n.id }) } catch { /* not available here */ }
  }

  function receive(n: AppNotification) {
    if (items.value.some(x => x.id === n.id)) return
    items.value = mergeNotifications(items.value, [n])
    showToast(n)
    ding()
    desktopAlert(n)
  }

  const onVisible = () => { if (!document.hidden) void refresh() }

  /** Safe to call from every page: it only starts once per person */
  async function start(forClinic: string, forUser: string, profileSeenAt?: string | null) {
    const key = `${forClinic}:${forUser}`
    if (!forClinic || !forUser || startedFor === key) return
    stop()
    startedFor = key
    clinicId = forClinic
    userId = forUser
    // When it is not known what was seen (e.g. before the database update), start from now
    // rather than telling everyone about a month of old alerts.
    seenAt.value = profileSeenAt ?? new Date().toISOString()
    await refresh()
    stopListening = notificationService.subscribe(forClinic, receive)
    document.addEventListener('visibilitychange', onVisible)
  }

  function stop() {
    stopListening?.()
    stopListening = null
    document.removeEventListener('visibilitychange', onVisible)
    startedFor = ''
    clinicId = ''
    userId = ''
    items.value = []
    toasts.value = []
    seenAt.value = null
    problem.value = ''
  }

  async function markAllSeen() {
    const newest = items.value[0]?.created_at
    if (!newest || !userId) return
    // The newest alert's own (server) time, so differences between clocks cannot hide a later one
    seenAt.value = newest
    await notificationService.markSeen(userId, newest)
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function setSound(on: boolean) {
    soundOn.value = on
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* private window */ }
    if (on) ding() // so they hear what they turned on
  }

  async function enableDesktop() {
    if (typeof Notification === 'undefined') return
    desktopPermission.value = await Notification.requestPermission()
  }

  return {
    items, seenAt, toasts, problem, soundOn, desktopPermission, unread, unreadCount,
    start, stop, refresh, receive, markAllSeen, dismissToast, setSound, enableDesktop,
  }
})
