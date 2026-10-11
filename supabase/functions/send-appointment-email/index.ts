import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.16"

const GMAIL_USER = Deno.env.get("GMAIL_USER")
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")?.replace(/\s/g, "")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const ADMIN_SECRET_KEY = Deno.env.get("ADMIN_SECRET_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "GMAIL_USER and GMAIL_APP_PASSWORD must be configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { appointment_id } = await req.json()
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: "appointment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL, ADMIN_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Two kinds of caller: logged-in clinic staff, or the anonymous public booking
    // page right after it creates an appointment.
    let callerClinicId: string | null = null
    const authHeader = req.headers.get("Authorization")
    if (authHeader) {
      const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await callerClient.auth.getUser()
      if (userData?.user) {
        const { data: callerProfile } = await supabase
          .from("profiles")
          .select("clinic_id")
          .eq("id", userData.user.id)
          .single()
        callerClinicId = callerProfile?.clinic_id ?? null
      }
    }

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        time_slot,
        status,
        clinic_id,
        created_at,
        confirmation_email_sent_at,
        patients ( full_name, email ),
        clinics ( name, plan, is_trial, trial_ends_at )
      `)
      .eq("id", appointment_id)
      .single()

    if (apptError || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (callerClinicId) {
      // Staff may only trigger emails for their own clinic
      if (callerClinicId !== appointment.clinic_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    } else {
      // Anonymous: only for an appointment created moments ago (created_at has no timezone, it's UTC)
      const ageMs = Date.now() - new Date(`${appointment.created_at}Z`).getTime()
      if (!(ageMs >= 0 && ageMs < 10 * 60 * 1000)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    if (appointment.confirmation_email_sent_at) {
      return new Response(JSON.stringify({ sent: false, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (appointment.status !== "confirmed") {
      return new Response(JSON.stringify({ sent: false, reason: "not_confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const clinic = appointment.clinics as {
      name: string
      plan: string
      is_trial: boolean
      trial_ends_at: string | null
    } | null

    const patient = appointment.patients as { full_name: string; email: string | null } | null

    if (!clinic || !patient?.email) {
      return new Response(JSON.stringify({ sent: false, reason: "missing_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const onTrial = clinic.is_trial && clinic.trial_ends_at && new Date(clinic.trial_ends_at) > new Date()
    const effectivePlan = onTrial ? "premium" : clinic.plan
    const canSendEmail = effectivePlan === "pro" || effectivePlan === "premium"

    if (!canSendEmail) {
      return new Response(JSON.stringify({ sent: false, reason: "plan_not_eligible" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const subject = `Appointment confirmed — ${clinic.name}`
    const html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0ea5e9;">Your appointment is confirmed</h2>
        <p>Hi ${escapeHtml(patient.full_name)},</p>
        <p>Your appointment at <strong>${escapeHtml(clinic.name)}</strong> has been confirmed.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formatDate(appointment.appointment_date)}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${escapeHtml(appointment.time_slot ?? "To be confirmed")}</p>
        </div>
        <p>Please contact the clinic if you need to reschedule.</p>
        <p style="color: #64748b; font-size: 14px;">— ${escapeHtml(clinic.name)}</p>
      </div>
    `

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })

    // Claim the send first so concurrent or replayed calls can't double-send
    const { data: claimed } = await supabase
      .from("appointments")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", appointment_id)
      .is("confirmation_email_sent_at", null)
      .select("id")
    if (!claimed?.length) {
      return new Response(JSON.stringify({ sent: false, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    try {
      await transporter.sendMail({
        from: `"${clinic.name.replace(/["\r\n]/g, "")}" <${GMAIL_USER}>`,
        to: patient.email,
        subject,
        html,
      })
    } catch (sendError) {
      await supabase.from("appointments").update({ confirmation_email_sent_at: null }).eq("id", appointment_id)
      throw sendError
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
