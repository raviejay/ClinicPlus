import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import { clinicService } from '@/services/clinic.service'
import type { AuthUser, Profile, Clinic, ClinicSettings } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const profile = ref<Profile | null>(null)
  const clinic = ref<Clinic | null>(null)
  const clinicSettings = ref<ClinicSettings | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const hasClinic = computed(() => !!profile.value?.clinic_id)

  async function initialize() {
    const session = await authService.getSession()
    if (session?.user) {
      user.value = { id: session.user.id, email: session.user.email ?? null }
      await loadProfile(session.user.id)
    }

    authService.onAuthStateChange(async (event, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        user.value = { id: session.user.id, email: session.user.email ?? null }
        await loadProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
        clinic.value = null
        clinicSettings.value = null
        router.push('/login')
      }
    })
  }

  async function loadProfile(userId: string) {
    const { data } = await authService.getProfile(userId)
    if (data) {
      profile.value = data
      if (data.clinic_id) await loadClinic(data.clinic_id)
    }
  }

  async function loadClinic(clinicId: string) {
    const [clinicRes, settingsRes] = await Promise.all([
      clinicService.getClinic(clinicId),
      clinicService.getClinicSettings(clinicId)
    ])
    if (clinicRes.data) clinic.value = clinicRes.data
    if (settingsRes.data) clinicSettings.value = settingsRes.data
  }

  async function signup(email: string, password: string) {
    loading.value = true
    const { data, error } = await authService.signup({ email, password })
    loading.value = false
    if (error) return { error }
    if (data) user.value = { id: data.userId, email }
    return { error: null }
  }

  async function login(email: string, password: string) {
    loading.value = true
    const { error } = await authService.login({ email, password })
    loading.value = false
    return { error }
  }

  async function logout() {
    await authService.logout()
  }

  return {
    user, profile, clinic, clinicSettings, loading,
    isAuthenticated, hasClinic,
    initialize, signup, login, logout, loadProfile, loadClinic
  }
})
