import { supabase } from './supabase'
import type { ClinicPlan, ApiResponse } from '@/types'

interface EdgeFunctionResponse {
  success: boolean
  id?: string
  checkoutUrl?: string
  referenceNumber?: string
  amount?: number
  error?: string
}

interface PaymentLinkResponse {
  checkout_url: string
  reference_number: string
  id: string
}

// The server works out the clinic from the logged-in admin, picks the price,
// and records the pending subscription. The browser only chooses the plan.
async function createPaymentLink(
  plan: ClinicPlan,
  redirectUrl: string
): Promise<ApiResponse<PaymentLinkResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
      'super-function',
      { body: { plan, redirectUrl } }
    )

    if (error) {
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
      return { data: null, error: body?.error ?? error.message }
    }

    if (!data?.success) {
      return { data: null, error: data?.error || 'Failed to create payment link' }
    }

    return {
      data: {
        checkout_url: data.checkoutUrl || '',
        reference_number: data.referenceNumber || '',
        id: data.id || '',
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export const paymongoSubscriptionService = {
  createPaymentLink,
}

export type { PaymentLinkResponse }
