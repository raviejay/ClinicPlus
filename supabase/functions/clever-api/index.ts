// PayMongo webhook: activates a clinic's subscription after a verified payment.
// Deploy with --no-verify-jwt (PayMongo can't send a Supabase JWT); the request
// is authenticated by the Paymongo-Signature header instead.
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const ADMIN_SECRET_KEY = Deno.env.get("ADMIN_SECRET_KEY")
const WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET")

const ACCEPTED_EVENTS = [
  "payment.paid",
  "link.payment.paid",
  "checkout_session.payment.paid",
]

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Header format: t=<timestamp>,te=<test signature>,li=<live signature>
async function isValidSignature(header: string | null, rawBody: string, livemode: boolean) {
  if (!header || !WEBHOOK_SECRET) return false
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=")
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  )
  const expected = livemode ? parts.li : parts.te
  if (!parts.t || !expected) return false

  // Reject replays older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(parts.t))
  if (!Number.isFinite(age) || age > 300) return false

  const computed = await hmacHex(WEBHOOK_SECRET, `${parts.t}.${rawBody}`)
  return timingSafeEqual(computed, expected)
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405)
  if (!ADMIN_SECRET_KEY || !WEBHOOK_SECRET) {
    console.error("ADMIN_SECRET_KEY or PAYMONGO_WEBHOOK_SECRET is not configured")
    return reply({ error: "Server is not configured" }, 500)
  }

  const rawBody = await req.text()

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return reply({ error: "Invalid JSON" }, 400)
  }

  const livemode = event.data?.attributes?.livemode === true
  if (!(await isValidSignature(req.headers.get("Paymongo-Signature"), rawBody, livemode))) {
    console.error("Webhook rejected: invalid signature")
    return reply({ error: "Invalid signature" }, 401)
  }

  const eventType = event.data?.attributes?.type
  if (!ACCEPTED_EVENTS.includes(eventType)) {
    return reply({ received: true, ignored: true })
  }

  const eventAttrs = event.data?.attributes?.data?.attributes
  const referenceNumber: string | undefined = eventAttrs?.reference_number
  const paymongoPaymentId: string | undefined =
    eventType === "checkout_session.payment.paid"
      ? eventAttrs?.payment_intent?.attributes?.payments?.[0]?.data?.id ??
        eventAttrs?.payments?.[0]?.data?.id
      : eventAttrs?.payments?.[0]?.data?.id

  if (!referenceNumber) {
    console.error("No reference_number in webhook payload, event type:", eventType)
    return reply({ received: true, error: "Missing reference_number" })
  }

  const supabase = createClient(SUPABASE_URL, ADMIN_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("reference_number", referenceNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (subError || !subscription) {
    console.error("Subscription not found for reference:", referenceNumber, subError)
    // 200 so PayMongo doesn't retry forever for a reference we'll never know
    return reply({ received: true, error: "Subscription not found" })
  }

  // Already processed (PayMongo retries and may send several event types per payment)
  if (subscription.status === "active" && subscription.paymongo_payment_id) {
    return reply({ received: true, duplicate: true })
  }

  // Immediate switch: cancel any other active subscription for this clinic
  const { error: cancelError } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("clinic_id", subscription.clinic_id)
    .eq("status", "active")
    .neq("id", subscription.id)
  if (cancelError) console.error("Failed to cancel old subscriptions:", cancelError)

  const { error: updateSubError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      paymongo_payment_id: paymongoPaymentId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)

  if (updateSubError) {
    console.error("Failed to update subscription:", updateSubError)
    return reply({ error: "Failed to update subscription" }, 500) // PayMongo will retry
  }

  const { error: updateClinicError } = await supabase
    .from("clinics")
    .update({ plan: subscription.plan, is_trial: false })
    .eq("id", subscription.clinic_id)

  if (updateClinicError) {
    console.error("Failed to update clinic:", updateClinicError)
    return reply({ error: "Failed to update clinic" }, 500)
  }

  console.log(`Activated ${subscription.plan} plan for clinic ${subscription.clinic_id}`)
  return reply({ received: true, success: true })
})
