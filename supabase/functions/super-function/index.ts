// Creates a PayMongo checkout session for the caller's own clinic and records
// the pending subscription server-side.
// Deploy with --no-verify-jwt; the caller's login is verified in code below.
import { createClient } from "npm:@supabase/supabase-js@2"

const PAYMONGO_SECRET_KEY = Deno.env.get("PAYMONGO_SECRET_KEY")
const ADMIN_SECRET_KEY = Deno.env.get("ADMIN_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
// Comma-separated list of origins checkout may redirect back to,
// e.g. "https://yourapp.vercel.app,http://localhost:5173"
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1"

// Amounts in centavos
const PLAN_PRICES: Record<string, number> = {
  starter: 59900,
  pro: 89900,
  premium: 199900,
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })

// Calendar months, clamped to the last day (Jan 31 + 1 month = Feb 28)
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed" }, 405)

  if (!PAYMONGO_SECRET_KEY || !ADMIN_SECRET_KEY) {
    return reply({ success: false, error: "Server is not configured" }, 500)
  }

  // Who is calling?
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return reply({ success: false, error: "Unauthorized" }, 401)

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) return reply({ success: false, error: "Unauthorized" }, 401)

  const admin = createClient(SUPABASE_URL, ADMIN_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Only a clinic admin can buy a plan, and only for their own clinic
  const { data: profile } = await admin
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", userData.user.id)
    .single()

  if (!profile?.clinic_id || !["admin", "super_admin"].includes(profile.role)) {
    return reply({ success: false, error: "Only clinic admins can change the plan" }, 403)
  }

  let body: { plan?: string; redirectUrl?: string }
  try {
    body = await req.json()
  } catch {
    return reply({ success: false, error: "Invalid request body" }, 400)
  }

  const plan = body.plan
  if (!plan || !PLAN_PRICES[plan]) return reply({ success: false, error: "Invalid plan" }, 400)

  const redirectOrigin = (body.redirectUrl ?? "").replace(/\/$/, "")
  if (!ALLOWED_ORIGINS.includes(redirectOrigin)) {
    return reply({ success: false, error: "Redirect URL not allowed" }, 400)
  }

  const { data: clinic } = await admin
    .from("clinics")
    .select("name")
    .eq("id", profile.clinic_id)
    .single()
  if (!clinic) return reply({ success: false, error: "Clinic not found" }, 404)

  const amount = PLAN_PRICES[plan]
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
  // Used by the webhook to match the payment to the pending subscription
  const referenceNumber = crypto.randomUUID().replace(/-/g, "").substring(0, 16)

  const response = await fetch(`${PAYMONGO_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PAYMONGO_SECRET_KEY}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: { name: clinic.name },
          line_items: [
            {
              currency: "PHP",
              amount,
              description: `ClinicPlus ${planLabel} Plan - ${clinic.name}`,
              name: `ClinicPlus ${planLabel} Plan`,
              quantity: 1,
            },
          ],
          payment_method_types: ["card", "gcash", "paymaya", "qrph"],
          success_url: `${redirectOrigin}/admin/billing?status=success`,
          cancel_url: `${redirectOrigin}/admin/billing?status=failed`,
          reference_number: referenceNumber,
          metadata: { clinic_id: profile.clinic_id, plan, type: "subscription" },
        },
      },
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data.errors?.[0]?.detail || "Failed to create checkout session"
    console.error("PayMongo error:", message)
    return reply({ success: false, error: message }, 400)
  }

  const attrs = data.data.attributes
  const now = new Date()

  // Renewing the same paid plan before it ends adds a month to the current end date instead of
  // restarting from today (no days lost). Any other change starts a fresh month from today.
  const { data: current } = await admin
    .from("subscriptions")
    .select("plan, next_billing_date, reference_number")
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "active")
    .order("next_billing_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Database timestamps carry no time zone; they are UTC
  const currentEnd = current && current.plan === plan && !current.reference_number.startsWith("TRIAL-")
    ? new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(current.next_billing_date) ? current.next_billing_date : `${current.next_billing_date}Z`)
    : null
  const periodStart = currentEnd && currentEnd > now ? currentEnd : now
  const nextBilling = addMonths(periodStart, 1)

  // The browser can't create or activate subscriptions; only this function and the webhook can
  const { error: insertError } = await admin.from("subscriptions").insert({
    clinic_id: profile.clinic_id,
    plan,
    status: "pending",
    payment_link_id: data.data.id,
    reference_number: attrs.reference_number,
    amount,
    billing_date: now.toISOString(),
    next_billing_date: nextBilling.toISOString(),
  })
  if (insertError) {
    console.error("Failed to record pending subscription:", insertError)
    return reply({ success: false, error: "Failed to start checkout" }, 500)
  }

  return reply({
    success: true,
    id: data.data.id,
    checkoutUrl: attrs.checkout_url,
    referenceNumber: attrs.reference_number,
    amount: attrs.line_items[0].amount,
  })
})
