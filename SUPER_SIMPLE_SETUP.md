# 🎯 SUPER SIMPLE EDGE FUNCTION SETUP

## Step 1️⃣: Create Folders (2 minutes)

**Open File Explorer and do this:**

```
C:\Users\sinit\clinic-saas.worktrees\agents-vue-branch-filter-composable\
                                                      ↓
                                            Right-click empty space
                                                      ↓
                                        Click "New" → "Folder"
                                                      ↓
                                            Type: "supabase"
                                                      ↓
                                          Press Enter
```

**Result:** You now have folder `supabase`

---

**Now go INSIDE that supabase folder:**

```
supabase\ (you are HERE now)
    ↓
Right-click empty space
    ↓
Click "New" → "Folder"
    ↓
Type: "functions"
    ↓
Press Enter
```

**Result:** You now have folder `supabase\functions`

---

**Now go INSIDE that functions folder:**

```
supabase\functions\ (you are HERE now)
    ↓
Right-click empty space
    ↓
Click "New" → "Folder"
    ↓
Type: "create-payment-link"
    ↓
Press Enter
```

**Result:** Final structure looks like:
```
supabase\
  └── functions\
      └── create-payment-link\
```

✅ **DONE with Step 1!**

---

## Step 2️⃣: Create index.ts File (3 minutes)

**Go INSIDE the create-payment-link folder you just made:**

```
supabase\functions\create-payment-link\ (you are HERE)
    ↓
Right-click empty space
    ↓
Click "New" → "Text Document"
    ↓
Type: "index.ts"
    ↓
Press Enter
```

**Result:** You have file `index.ts`

---

**Open index.ts with a text editor:**

```
Right-click index.ts
    ↓
Click "Open With" → Choose any text editor
(Notepad, VS Code, or anything)
```

**Copy this code and paste it into index.ts:**

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

**Save the file:**
```
Press Ctrl+S
```

✅ **DONE with Step 2!**

---

## Step 3️⃣: Add Secret to Supabase (2 minutes)

**Go to:** https://supabase.com/dashboard/projects

**Then do this:**

```
1. You see your projects
   ↓
2. Click on your "ClinicPlus" project
   ↓
3. On left side menu, click "Settings"
   ↓
4. In Settings, scroll down and find "Secrets"
   ↓
5. Click "New Secret" button
```

**A form appears:**



**Click "Save"**

✅ **DONE with Step 3!**

---

## Step 4️⃣: Deploy Function (2 minutes)

**Open Terminal in VS Code:**

```
In VS Code:
    ↓
View → Terminal (or Ctrl+`)
    ↓
Terminal appears at bottom
```

**Type this command:**

```bash
supabase functions deploy create-payment-link --project-id pnmfsenqutbsopzaatvj
```

**Press Enter**

**Wait for message:**
```
✓ Function deployed successfully
```

✅ **DONE with Step 4!**

---

## Step 5️⃣: Update Frontend Code (3 minutes)

**Open file:** `src/services/paymongoSubscription.service.ts`

**Delete ALL the code inside and replace with:**

```typescript
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

async function createPaymentLink(
  clinicId: string,
  clinicName: string,
  plan: ClinicPlan,
  redirectUrl: string
): Promise<ApiResponse<PaymentLinkResponse>> {
  try {
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

    const data: EdgeFunctionResponse = await response.json()

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
        id: data.id || "",
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

export type { PaymentLinkResponse }
```

**Save file:**
```
Press Ctrl+S
```

✅ **DONE with Step 5!**

---

## Step 6️⃣: Remove Old API Key (1 minute)

**Open file:** `.env.local`

**Look for this line:**
```
VITE_PAYMONGO_SECRET_KEY=sk_test_...
```

**Delete that entire line if it exists**

**Your `.env.local` should only have:**
```
VITE_SUPABASE_URL=https://pnmfsenqutbsopzaatvj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Save file:**
```
Press Ctrl+S
```

✅ **DONE with Step 6!**

---

## ✅ ALL DONE!

Your app is now **SECURE**!

**Now test if it works:**

```bash
npm run dev
```

Go to: `/admin/billing`

Click "Upgrade to Pro"

You should see a PayMongo checkout page! 🎉

---

## 📞 Need Help?

Ask which step you're stuck on:
- Step 1: Can't create folders?
- Step 2: Can't create index.ts?
- Step 3: Can't find Supabase Secrets?
- Step 4: Terminal command not working?
- Step 5: Can't update the file?
- Step 6: Can't find `.env.local`?

I'm here! 😊
