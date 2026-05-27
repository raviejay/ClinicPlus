import { supabase } from './supabase'
import type { SignupPayload, LoginPayload, ApiResponse, Profile } from '@/types'

export const authService = {
  async signup({ email, password }: SignupPayload): Promise<ApiResponse<{ userId: string }>> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'user',
        }
      }
    })
    if (error) return { data: null, error: error.message }
    if (!data.user) return { data: null, error: 'Signup failed. Please try again.' }
    return { data: { userId: data.user.id }, error: null }
  },

  async login({ email, password }: LoginPayload): Promise<ApiResponse<{ userId: string }>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data: null, error: error.message }
    if (!data.user) return { data: null, error: 'Login failed. Please try again.' }
    return { data: { userId: data.user.id }, error: null }
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
