# Deploy Edge Function via Dashboard (No CLI Needed!)

## Step 1: Go to Supabase Dashboard

**Open:** https://supabase.com/dashboard/projects

---

## Step 2: Create Edge Function via UI

```
1. Click your "ClinicPlus" project
2. On left menu → Edge Functions
3. Click "Create a new function"
4. Name: "create-payment-link"
5. Click "Create function"
```

---

## Step 3: Paste the Function Code

**A code editor appears. Paste this code:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PAYMONGO_SECRET_KEY = Deno.env.get("PAYMONGO_SECRET_KEY")
const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1"

interface CreatePaymentLinkRequest {
  clinicId: string
  clinicName: string
  plan: "starter" | "pro" | "premium"
  redirectUrl: string
}

const PLAN_PRICES: Record<string, number> = {
  starter: 59900,
  pro: 89900,
  premium: 199900,
}

async function createPaymentLink(req: CreatePaymentLinkRequest) {
  try {
    if (!req.clinicId || !req.clinicName || !req.plan) {
      return {
        success: false,
        error: "Missing required fields",
      }
    }

    if (!PLAN_PRICES[req.plan]) {
      return {
        success: false,
        error: "Invalid plan",
      }
    }

    if (!PAYMONGO_SECRET_KEY) {
      return {
        success: false,
        error: "PAYMONGO_SECRET_KEY not configured",
      }
    }

    const amount = PLAN_PRICES[req.plan]

    const payload = {
      data: {
        attributes: {
          amount,
          currency: "PHP",
          description: `ClinicPlus ${req.plan} Plan - ${req.clinicName}`,
          statement_descriptor: "ClinicPlus",
          metadata: {
            clinic_id: req.clinicId,
            plan: req.plan,
            type: "subscription",
          },
          redirect: {
            success: `${req.redirectUrl}?status=success`,
            failed: `${req.redirectUrl}?status=failed`,
          },
        },
      },
    }

    const response = await fetch(`${PAYMONGO_BASE_URL}/links`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${PAYMONGO_SECRET_KEY}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.errors?.[0]?.detail || "Failed to create payment link"
      return {
        success: false,
        error: errorMsg,
      }
    }

    return {
      success: true,
      id: data.data.id,
      checkoutUrl: data.data.attributes.checkout_url,
      referenceNumber: data.data.attributes.reference_number,
      amount: data.data.attributes.amount,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  try {
    const body = await req.json()
    const result = await createPaymentLink(body)

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: result.success ? 200 : 400,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
})
```

---



---

## Step 5: Deploy

**Click "Deploy" button** at the bottom

✅ **Function is now LIVE!**

---

## Step 6: Continue with Frontend Setup

Once deployed, follow the remaining steps:

**Step 5: Update Frontend Code**
- Open: `src/services/paymongoSubscription.service.ts`
- Replace with the secure version (see SUPER_SIMPLE_SETUP.md)

**Step 6: Remove Old API Key**
- Open: `.env.local`
- Remove: `VITE_PAYMONGO_SECRET_KEY`

---

## Done! ✅

Your app is now secure and ready to test! 🎉
