import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!serviceRoleKey) {
  console.warn(
    "VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Staff invite will not work.",
  );
}

// Admin client — bypasses RLS completely
// Only used server-side operations like creating staff accounts
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
