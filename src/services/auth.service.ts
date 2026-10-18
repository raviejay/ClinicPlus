import { supabase } from './supabase'
import type { SignupPayload, LoginPayload, ApiResponse, Profile } from '@/types'

export const authService = {
  async signup({ email, password, captchaToken }: SignupPayload): Promise<ApiResponse<{ userId: string }>> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'user',
        },
        captchaToken,
      }
    })
    if (error) return { data: null, error: error.message }
    if (!data.user) return { data: null, error: 'Signup failed. Please try again.' }
    return { data: { userId: data.user.id }, error: null }
  },

  async login({ email, password, captchaToken }: LoginPayload): Promise<ApiResponse<{ userId: string }>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (error) return { data: null, error: error.message }
    if (!data.user) return { data: null, error: 'Login failed. Please try again.' }
    return { data: { userId: data.user.id }, error: null }
  },

  // The link in the email brings the person back to /reset-password with a short-lived session
  async requestPasswordReset(email: string, captchaToken?: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    })
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },

  async updatePassword(password: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  async getCurrentUser() {
    const { data } = await supabase.auth.getUser()
    return data.user
  },

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return data.session
  },

  async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
