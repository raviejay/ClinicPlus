// Clinic Subscription Service
// Manages subscription records and plan changes in the database

import { supabase } from './supabase'
import type { ApiResponse, ClinicPlan, Subscription } from '@/types'

export interface CreateSubscriptionInput {
  clinic_id: string
  plan: ClinicPlan
  payment_link_id: string
  reference_number: string
  amount: number
}

export const subscriptionService = {
  // Create a new subscription record
  async createSubscription(data: CreateSubscriptionInput): Promise<ApiResponse<Subscription>> {
    const today = new Date()
    const nextBillingDate = new Date(today)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        clinic_id: data.clinic_id,
        plan: data.plan,
        status: 'pending',
        payment_link_id: data.payment_link_id,
        reference_number: data.reference_number,
        amount: data.amount,
        billing_date: today.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
      })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: subscription as Subscription, error: null }
  },

  // Get active subscription for clinic
  async getActiveSubscription(clinicId: string): Promise<ApiResponse<Subscription>> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data: data as Subscription | null, error: null }
  },

  // Update subscription status (called after PayMongo payment confirmation)
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'active' | 'cancelled' | 'expired',
    paymongoPaymentId?: string
  ): Promise<ApiResponse<Subscription>> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (paymongoPaymentId) {
      updateData.paymongo_payment_id = paymongoPaymentId
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Subscription, error: null }
  },

  // Get subscription by payment link ID
  async getSubscriptionByPaymentLink(
    paymentLinkId: string
  ): Promise<ApiResponse<Subscription>> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('payment_link_id', paymentLinkId)
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Subscription, error: null }
  },

  // Get all subscriptions for clinic
  async getClinicSubscriptions(clinicId: string): Promise<ApiResponse<Subscription[]>> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as Subscription[], error: null }
  },

  // Check which clinics need billing
  async getClinicsPendingBilling(): Promise<ApiResponse<string[]>> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('subscriptions')
      .select('clinic_id')
      .eq('status', 'active')
      .lte('next_billing_date', `${today}T23:59:59`)

    if (error) return { data: null, error: error.message }
    return {
      data: data?.map((row: { clinic_id: string }) => row.clinic_id) ?? [],
      error: null,
    }
  },
}