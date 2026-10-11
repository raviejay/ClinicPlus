// Creates a doctor/staff account for the caller's own clinic.
// The secret key stays on the server; the caller must be an admin of the clinic.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `Cg-${body}9`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminKey = Deno.env.get("ADMIN_SECRET_KEY");
  if (!adminKey) return json({ error: "Server is not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  // Identify the caller from their own JWT
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Caller must be an admin; the clinic comes from their profile, never from the request
  const { data: caller } = await admin
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", userData.user.id)
    .single();

  if (!caller?.clinic_id || !["admin", "super_admin"].includes(caller.role)) {
    return json({ error: "Only clinic admins can add staff" }, 403);
  }

  let payload: { email?: string; full_name?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.full_name?.trim();
  if (!email || !fullName) return json({ error: "Email and full name are required" }, 400);
  if (payload.role !== "doctor" && payload.role !== "staff") {
    return json({ error: "Role must be doctor or staff" }, 400);
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Failed to create user" }, 400);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    clinic_id: caller.clinic_id,
    full_name: fullName,
    role: payload.role,
  });
  if (profileError) {
    // Don't leave an orphaned auth user behind
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError.message }, 400);
  }

  return json({ password: tempPassword });
});
