# 🔐 SECURE PAYMONGO SETUP WITH SUPABASE EDGE FUNCTIONS

## Problem We're Solving

❌ **Current (INSECURE) approach:**
```typescript
// This exposes your API key to the browser! ❌
const PAYMONGO_API_KEY = import.meta.env.VITE_PAYMONGO_SECRET_KEY
```

✅ **Better approach:**
Use Supabase Edge Functions to keep API key SECRET on backend

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                   USER FLOW                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Frontend: User clicks "Upgrade"                │
│     └─ Calls: POST /functions/v1/create-payment    │
│                                                     │
│  2. Edge Function (Supabase Server):               │
│     ├─ Receives: clinicId, plan, redirectUrl       │
│     ├─ Has SECRET: PAYMONGO_SECRET_KEY (env var)   │
│     ├─ Calls: PayMongo API with key                │
│     └─ Returns: Checkout URL only                  │
│                                                     │
│  3. Frontend: Gets checkout URL                    │
│     └─ Redirects user to PayMongo                  │
│                                                     │
│  Result: ✓ API key never exposed to browser!       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### Step 1: Enable Edge Functions in Supabase

**Go to Supabase Dashboard:**
```
Project → Edge Functions → Enable
```

### Step 2: Create the Edge Function

**Run this command in your terminal:**
```bash
# Create edge function locally
supabase functions new create-payment-link

# This creates: supabase/functions/create-payment-link/index.ts
```

### Step 3: Add the Function Code

**File: `supabase/functions/create-payment-link/index.ts`**

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
  starter: 59900,   // ₱599
  pro: 89900,       // ₱899
  premium: 199900,  // ₱1,999
}

async function createPaymentLink(req: CreatePaymentLinkRequest) {
  try {
    // Validate inputs
    if (!req.clinicId || !req.clinicName || !req.plan) {
      return {
        success: false,
        error: "Missing required fields",
      }
    }

    if (!PLAN_PRICES[req.plan]) {
      return {
        success: false,
        error: "Invalid plan selected",
      }
    }

    const amount = PLAN_PRICES[req.plan]

    // Create payload for PayMongo
    const payload = {
      data: {
        attributes: {
          amount,
          currency: "PHP",
          description: `ClinicPlus ${req.plan} Plan - ${req.clinicName}`,
          statement_descriptor: "ClinicPlus Subscription",
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

    // Call PayMongo API (API key is SECRET here!)
    const response = await fetch(`${PAYMONGO_BASE_URL}/links`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${PAYMONGO_SECRET_KEY}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.errors?.[0]?.detail || "Failed to create payment link",
      }
    }

    const data = await response.json()

    // Return only safe data (no API key exposed!)
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
  // CORS
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
    })
  }

  const body = await req.json()
  const result = await createPaymentLink(body)

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    status: result.success ? 200 : 400,
  })
})
```

### Step 4: Add Environment Variables

**File: `supabase/.env.local`**

```env
PAYMONGO_SECRET_KEY=sk_live_your_actual_secret_key_here
```

### Step 5: Deploy the Function

```bash
# Deploy to Supabase
supabase functions deploy create-payment-link --project-id your_project_id
```

---

## Update Frontend Service

Now update your frontend service to use the Edge Function instead of calling PayMongo directly.

**File: `src/services/paymongoSubscription.service.ts`**

```typescript
// SECURE VERSION - Uses Edge Function
import type { ClinicPlan, ApiResponse } from '@/types'

interface PaymentLinkResponse {
  success: boolean
  id?: string
  checkoutUrl?: string
  referenceNumber?: string
  amount?: number
  error?: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

async function createPaymentLink(
  clinicId: string,
  clinicName: string,
  plan: ClinicPlan,
  redirectUrl: string
): Promise<ApiResponse<{ checkout_url: string; reference_number: string }>> {
  try {
    // Call our Edge Function (API key is SAFE here!)
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-payment-link`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicId,
          clinicName,
          plan,
          redirectUrl,
        }),
      }
    )

    const data: PaymentLinkResponse = await response.json()

    if (!data.success) {
      return {
        data: null,
        error: data.error || "Failed to create payment link",
      }
    }

    return {
      data: {
        checkout_url: data.checkoutUrl || "",
        reference_number: data.referenceNumber || "",
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export const paymongoSubscriptionService = {
  createPaymentLink,
}
```

---

## Security Benefits

### ✅ What Changed

```
BEFORE (Insecure):
┌─────────────────────────────────────┐
│ Frontend Browser                    │
│ └─ Has PayMongo secret key exposed  │ ❌
│    (anyone can see it!)             │
└─────────────────────────────────────┘

AFTER (Secure):
┌─────────────────────────────────────┐
│ Frontend Browser                    │
│ └─ Has NO secret keys              │ ✓
│    (frontend can't see API key)     │
│         ↓                           │
│ Supabase Edge Function              │
│ └─ Has PayMongo secret key (safe!)  │ ✓
│    (protected by environment)       │
└─────────────────────────────────────┘
```

### ✅ What's Protected

| Item | Before | After |
|------|--------|-------|
| **API Key** | Exposed | Secret ✓ |
| **Browser DevTools** | Shows key | No key visible ✓ |
| **Network Traffic** | See key | See checkout URL only ✓ |
| **Source Code** | See key | No hardcoded key ✓ |
| **Hacker Access** | Gets API key | Can't get key ✓ |

---

## Testing Your Setup

### Test 1: Verify Edge Function is Running

```bash
# Check function status
supabase functions list --project-id your_project_id
```

### Test 2: Test Payment Link Creation

```bash
# Call the function
curl -X POST https://your-project.supabase.co/functions/v1/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "clinicId": "test-clinic",
    "clinicName": "Test Clinic",
    "plan": "pro",
    "redirectUrl": "http://localhost:5173/admin/billing"
  }'

# Expected response:
# {
#   "success": true,
#   "checkoutUrl": "https://checkout.paymongo.com/...",
#   "referenceNumber": "..."
# }
```

### Test 3: Check Logs

```bash
# View Edge Function logs
supabase functions list logs create-payment-link --project-id your_project_id
```

---

## Environment Variables Checklist

✅ **Need to add to Supabase:**
```
Project Settings → Secrets
├─ PAYMONGO_SECRET_KEY = sk_live_...
```

✅ **Frontend .env.local (NO secrets here anymore!):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

✅ **NO more frontend secret keys!**
```
❌ VITE_PAYMONGO_SECRET_KEY (REMOVE THIS!)
```

---

## Troubleshooting

### Issue: "Function not found"
```
Solution:
1. Verify function name: create-payment-link
2. Check: supabase functions list
3. Redeploy: supabase functions deploy
```

### Issue: "PAYMONGO_SECRET_KEY not found"
```
Solution:
1. Go to Supabase Dashboard
2. Settings → Secrets
3. Add: PAYMONGO_SECRET_KEY with your key
4. Redeploy function
```

### Issue: "CORS error"
```
Solution: Already handled in the function
(Access-Control-Allow-Origin: * is set)
```

---

## What's Different from Before

```
BEFORE:
src/services/paymongoSubscription.service.ts
└─ Had PAYMONGO_SECRET_KEY ❌
└─ Called PayMongo directly from browser ❌
└─ API key exposed in DevTools ❌

AFTER:
src/services/paymongoSubscription.service.ts
└─ Calls Edge Function only ✓
└─ No API keys in frontend ✓
└─ Safe to open DevTools ✓

supabase/functions/create-payment-link/index.ts
└─ NEW ✓
└─ Keeps API key SECRET ✓
└─ Communicates with PayMongo ✓
```

---

## Deployment to Production

### Step 1: Test Locally
```bash
npm run dev
# Test /admin/billing payment flow
```

### Step 2: Deploy Function
```bash
supabase functions deploy create-payment-link --project-id your_prod_project_id
```

### Step 3: Add Production Secrets
```
Supabase Dashboard (Production) → Settings → Secrets
Add: PAYMONGO_SECRET_KEY with your LIVE key
```

### Step 4: Deploy Frontend
```bash
npm run build
npm run deploy
```

---

## ✅ You're Now Secure!

Your PayMongo API key is:
- ✅ Never exposed to the browser
- ✅ Never sent to customers
- ✅ Only used on the server
- ✅ Protected by Supabase environment

**Congratulations! Your subscription system is now production-ready and SECURE!** 🎉
