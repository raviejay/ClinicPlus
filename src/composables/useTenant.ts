import { useAuthStore } from '@/stores/auth'

// Enforces clinic_id on every query — call this before any Supabase query
export function useTenant() {
  const authStore = useAuthStore()

  const clinicId = authStore.profile?.clinic_id

  if (!clinicId) {
    throw new Error('No clinic context. User must belong to a clinic.')
  }

  // Scopes any query builder to the current clinic
  function scopeQuery<T extends { eq: (col: string, val: string) => T }>(query: T): T {
    return query.eq('clinic_id', clinicId as string)
  }

  return { clinicId, scopeQuery }
}