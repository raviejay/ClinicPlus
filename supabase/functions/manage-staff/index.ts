// Admin tools for the clinic's own doctors and staff:
//   details        -> email + last sign-in for everyone in the clinic
//   reset_password -> a new temporary password for one member
//   set_active     -> deactivate (locks the account out) or reactivate
// The secret key stays on the server; the caller must be an admin, and the target must be
// a doctor/staff member of the caller's own clinic (taken from the caller's profile, never the request).
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

// ~100 years: Supabase has no "forever", and reactivating clears it
const BAN_FOREVER = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminKey = Deno.env.get("ADMIN_SECRET_KEY");
  if (!adminKey) return json({ error: "Server is not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
  const callerId = userData.user.id;

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: caller } = await admin
    .from("profiles")
    .select("clinic_id, role, is_active")
    .eq("id", callerId)
    .single();
  if (!caller?.clinic_id || !caller.is_active || !["admin", "super_admin"].includes(caller.role)) {
    return json({ error: "Only clinic admins can manage staff" }, 403);
  }

  let payload: { action?: string; user_id?: string; active?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (payload.action === "details") {
    const { data: members } = await admin.from("profiles").select("id").eq("clinic_id", caller.clinic_id);
    const details = await Promise.all(
      (members ?? []).map(async (m: { id: string }) => {
        const { data } = await admin.auth.admin.getUserById(m.id);
        return {
          id: m.id,
          email: data?.user?.email ?? null,
          last_sign_in_at: data?.user?.last_sign_in_at ?? null,
        };
      }),
    );
    return json({ details });
  }

  if (payload.action !== "reset_password" && payload.action !== "set_active") {
    return json({ error: "Unknown action" }, 400);
  }

  // Everything below changes one member: they must be a doctor/staff of this clinic
  if (!payload.user_id) return json({ error: "Missing user" }, 400);
  if (payload.user_id === callerId) return json({ error: "Use your own account settings for yourself" }, 400);

  const { data: target } = await admin
    .from("profiles")
    .select("id, clinic_id, role, is_active")
    .eq("id", payload.user_id)
    .single();
  if (!target || target.clinic_id !== caller.clinic_id) return json({ error: "Team member not found" }, 404);
  if (!["doctor", "staff"].includes(target.role)) return json({ error: "Admin accounts cannot be managed here" }, 403);

  if (payload.action === "reset_password") {
    const password = generateTempPassword();
    const { data, error } = await admin.auth.admin.updateUserById(target.id, { password });
    if (error || !data.user) return json({ error: error?.message ?? "Could not reset the password" }, 400);
    return json({ email: data.user.email, password });
  }

  // set_active
  if (typeof payload.active !== "boolean") return json({ error: "Missing status" }, 400);
  const { error: banError } = await admin.auth.admin.updateUserById(target.id, {
    ban_duration: payload.active ? "none" : BAN_FOREVER,
  });
  if (banError) return json({ error: banError.message }, 400);

  const { error: profileError } = await admin.from("profiles").update({ is_active: payload.active }).eq("id", target.id);
  if (profileError) {
    // Keep sign-in and database status in step
    await admin.auth.admin.updateUserById(target.id, { ban_duration: payload.active ? BAN_FOREVER : "none" });
    return json({ error: profileError.message }, 400);
  }
  return json({ ok: true, is_active: payload.active });
});
