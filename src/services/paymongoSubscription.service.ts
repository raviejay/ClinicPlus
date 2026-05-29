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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function createPaymentLink(
  clinicId: string,
  clinicName: string,
  plan: ClinicPlan,
  redirectUrl: string
): Promise<ApiResponse<PaymentLinkResponse>> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/super-function`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          clinicId,
          clinicName,
          plan,
          redirectUrl,
        }),
      }
    )

    const data: EdgeFunctionResponse = await response.json()

    if (!data.success) {
      return {
        data: null,
        error: data.error || 'Failed to create payment link',
      }
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