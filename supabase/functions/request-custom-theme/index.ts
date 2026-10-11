// A Premium clinic admin asks the ClinicGo team for a custom booking-page theme.
// Saves the request, emails the team (reply-to = the clinic), and sends the clinic an acknowledgement.
// Deploy with --no-verify-jwt; the caller's login is verified in code below.
//
// Secrets: ADMIN_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD (already set for the email function)
//          SUPPORT_EMAIL (where requests are sent; falls back to GMAIL_USER)
//          APP_URL (optional, e.g. https://yourapp.vercel.app — adds a link to the clinic's booking page)
import { createClient } from "npm:@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.16"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const ADMIN_SECRET_KEY = Deno.env.get("ADMIN_SECRET_KEY")
const GMAIL_USER = Deno.env.get("GMAIL_USER")
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")?.replace(/\s/g, "")
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") || GMAIL_USER
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "")

const MAX_REQUESTS_PER_DAY = 3

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405)

  if (!ADMIN_SECRET_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD || !SUPPORT_EMAIL) {
    console.error("request-custom-theme is not fully configured")
    return reply({ error: "This feature isn't available right now. Please try again later." }, 500)
  }

  // Who is calling?
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return reply({ error: "Unauthorized" }, 401)
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) return reply({ error: "Unauthorized" }, 401)

  const admin = createClient(SUPABASE_URL, ADMIN_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Only an admin of a clinic, for their own clinic
  const { data: profile } = await admin
    .from("profiles")
    .select("clinic_id, role, full_name")
    .eq("id", userData.user.id)
    .single()
  if (!profile?.clinic_id || !["admin", "super_admin"].includes(profile.role)) {
    return reply({ error: "Only clinic admins can request a custom theme" }, 403)
  }

  const { data: plan } = await admin.rpc("clinic_effective_plan", { p_clinic: profile.clinic_id })
  if (plan !== "premium") {
    return reply({ error: "Custom themes are available on the Premium plan." }, 403)
  }

  let body: { message?: string; contact_email?: string; reference_url?: string }
  try {
    body = await req.json()
  } catch {
    return reply({ error: "Invalid request" }, 400)
  }

  const message = (body.message ?? "").trim()
  const contactEmail = (body.contact_email ?? "").trim().toLowerCase()
  const referenceUrl = (body.reference_url ?? "").trim()

  if (message.length < 20) return reply({ error: "Please tell us a bit more (at least 20 characters)." }, 400)
  if (message.length > 2000) return reply({ error: "Your message is too long (2000 characters max)." }, 400)
  if (!isEmail(contactEmail)) return reply({ error: "Please enter a valid email so we can reply." }, 400)
  if (referenceUrl && (!/^https?:\/\/\S+$/i.test(referenceUrl) || referenceUrl.length > 300)) {
    return reply({ error: "The reference link must start with http:// or https://" }, 400)
  }

  // Don't let one clinic flood the inbox
  const { count } = await admin
    .from("custom_theme_requests")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", profile.clinic_id)
    .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) {
    return reply({ error: "You've sent a few requests today already. We'll get back to you soon." }, 429)
  }

  const { data: clinic } = await admin
    .from("clinics")
    .select("name, slug")
    .eq("id", profile.clinic_id)
    .single()
  if (!clinic) return reply({ error: "Clinic not found" }, 404)

  const { data: saved, error: insertError } = await admin
    .from("custom_theme_requests")
    .insert({
      clinic_id: profile.clinic_id,
      requested_by: userData.user.id,
      contact_email: contactEmail,
      message,
      reference_url: referenceUrl || null,
    })
    .select("id, status, created_at")
    .single()
  if (insertError || !saved) {
    console.error("Failed to save theme request:", insertError)
    return reply({ error: "Couldn't save your request. Please try again." }, 500)
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  const requester = profile.full_name?.trim() || contactEmail
  const bookingUrl = APP_URL ? `${APP_URL}/book/${clinic.slug}` : `/book/${clinic.slug}`
  const safeClinicName = clinic.name.replace(/["\r\n]/g, "")

  try {
    await transporter.sendMail({
      from: `"ClinicGo" <${GMAIL_USER}>`,
      to: SUPPORT_EMAIL,
      replyTo: contactEmail,
      subject: `Custom theme request — ${safeClinicName}`.replace(/[\r\n]/g, " "),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #1e293b;">
          <h2 style="margin: 0 0 4px;">New custom theme request</h2>
          <p style="margin: 0 0 16px; color: #64748b;">Reply to this email to reach ${escapeHtml(requester)} directly.</p>
          <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 130px;">Clinic</td><td><strong>${escapeHtml(clinic.name)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Requested by</td><td>${escapeHtml(requester)} &lt;${escapeHtml(contactEmail)}&gt;</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Plan</td><td>Premium</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Booking page</td><td>${escapeHtml(bookingUrl)}</td></tr>
            ${referenceUrl ? `<tr><td style="padding: 6px 0; color: #64748b;">Reference</td><td>${escapeHtml(referenceUrl)}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #64748b;">Request ID</td><td style="font-family: monospace;">${saved.id}</td></tr>
          </table>
          <h3 style="margin: 20px 0 6px;">What they asked for</h3>
          <div style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 14px;">${escapeHtml(message)}</div>
        </div>`,
    })
  } catch (err) {
    // Nobody on the team would ever see it: remove the row and let the clinic retry
    console.error("Failed to email the team:", err)
    await admin.from("custom_theme_requests").delete().eq("id", saved.id)
    return reply({ error: "We couldn't send your request right now. Please try again in a few minutes." }, 502)
  }

  // Best effort: let the clinic know we got it
  try {
    await transporter.sendMail({
      from: `"ClinicGo" <${GMAIL_USER}>`,
      to: contactEmail,
      replyTo: SUPPORT_EMAIL,
      subject: "We received your custom theme request",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; color: #1e293b;">
          <h2 style="color: #0ea5e9;">Thanks, we've got your request</h2>
          <p>Hi ${escapeHtml(requester)},</p>
          <p>We received your custom theme request for <strong>${escapeHtml(clinic.name)}</strong>. Our team will review it and reply to this email address.</p>
          <p style="color: #64748b; font-size: 13px;">Your message:</p>
          <div style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 14px;">${escapeHtml(message)}</div>
        </div>`,
    })
  } catch (err) {
    console.error("Failed to send acknowledgement:", err)
  }

  return reply({ ok: true, id: saved.id, status: saved.status, created_at: saved.created_at })
})
