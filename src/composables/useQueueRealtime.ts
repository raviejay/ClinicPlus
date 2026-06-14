/**
 * useQueueRealtime
 *
 * Shared composable that owns the authoritative queue state for a clinic.
 * Both QueuePage and QueueTVDisplay use this so they stay in sync via
 * Supabase Realtime — no polling, no page refreshes.
 *
 * Architecture:
 *  - Initial fetch on first call (or when clinicId changes)
 *  - Supabase Realtime subscription handles INSERT / UPDATE / DELETE
 *  - On INSERT: fetch the full row with joins, prepend to local state
 *  - On UPDATE: patch the record in-place (status changes, etc.)
 *  - On DELETE: remove the record from local state
 *  - Subscription is torn down on unmount via onUnmounted
 *  - Channel name includes clinicId + date to avoid cross-tenant bleed
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'
import { queueService, type QueueWithPatient } from '@/services/queue.service'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { QueueStatus } from '@/types'

export function useQueueRealtime(clinicId: string) {
  const queue = ref<QueueWithPatient[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let channel: RealtimeChannel | null = null

  // ── Computed views ───────────────────────────────────────────────────────────

  const waiting = computed(() =>
    queue.value
      .filter(q => q.status === 'waiting')
      .sort((a, b) => a.priority_number - b.priority_number)
  )

  const nowServing = computed(() =>
    queue.value.find(q => q.status === 'now_serving') ?? null
  )

  const done = computed(() =>
    queue.value
      .filter(q => q.status === 'done')
      .sort((a, b) => b.priority_number - a.priority_number)
      .slice(0, 20)
  )

  const counts = computed(() => ({
    waiting: queue.value.filter(q => q.status === 'waiting').length,
    now_serving: queue.value.filter(q => q.status === 'now_serving').length,
    done: queue.value.filter(q => q.status === 'done').length,
  }))

  // ── Initial fetch ────────────────────────────────────────────────────────────

  async function loadQueue() {
    if (!clinicId) return
    loading.value = true
    error.value = null
    const { data, error: err } = await queueService.getTodayQueue(clinicId)
    if (err) {
      error.value = err
    } else {
      queue.value = data ?? []
    }
    loading.value = false
  }

  // ── Fetch a single queue row with patient join (for INSERT events) ────────────

  async function fetchSingleRow(id: string): Promise<QueueWithPatient | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error: err } = await supabase
      .from('queue')
      .select('*, patients(full_name, contact_number), profiles(full_name)')
      .eq('id', id)
      .eq('queue_date', today)
      .maybeSingle()
    if (err || !data) return null
    return data as QueueWithPatient
  }

  // ── Realtime subscription ────────────────────────────────────────────────────

  function subscribe() {
    if (channel) {
      channel.unsubscribe()
      channel = null
    }

    const today = new Date().toISOString().split('T')[0]
    const channelName = `queue-rt:${clinicId}:${today}`

    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queue',
          filter: `clinic_id=eq.${clinicId}`,
        },
        async (payload) => {
          try {
            const newRow = payload.new as { id: string; queue_date: string }
            // Only process today's records
            if (newRow.queue_date !== today) return

            // Avoid duplicates
            if (queue.value.some(q => q.id === newRow.id)) return

            const full = await fetchSingleRow(newRow.id)
            if (full) {
              queue.value = [...queue.value, full].sort(
                (a, b) => a.priority_number - b.priority_number
              )
            }
          } catch (e) {
            console.error('[QueueRealtime] INSERT handler error:', e)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          try {
            const updated = payload.new as { id: string; status: QueueStatus; queue_date: string }
            if (updated.queue_date !== today) return

            queue.value = queue.value.map(q =>
              q.id === updated.id ? { ...q, ...updated } : q
            )
          } catch (e) {
            console.error('[QueueRealtime] UPDATE handler error:', e)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'queue',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          try {
            const deleted = payload.old as { id: string }
            queue.value = queue.value.filter(q => q.id !== deleted.id)
          } catch (e) {
            console.error('[QueueRealtime] DELETE handler error:', e)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[QueueRealtime] Subscribed to ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[QueueRealtime] Channel error on ${channelName}`)
        }
      })
  }

  function unsubscribe() {
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    queue,
    loading,
    error,
    waiting,
    nowServing,
    done,
    counts,
    loadQueue,
    subscribe,
    unsubscribe,
  }
}
