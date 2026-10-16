import { supabase } from "./supabase";
import type { Profile, ApiResponse } from "@/types";
import { useBranchFilter } from "@/composables/useBranchFilter";

export interface Credentials { email: string; password: string }
export interface MemberDetails { id: string; email: string | null; last_sign_in_at: string | null }

// Calls an Edge Function and surfaces the function's own error message when it returned one
async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { data: null, error: detail?.error ?? error.message };
  }
  if (data?.error) return { data: null, error: data.error };
  return { data: data as T, error: null };
}

export const staffService = {
  async getAll(clinicId: string): Promise<ApiResponse<Profile[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase
      .from("profiles")
      .select("*")
      .eq("clinic_id", clinicId)

    query = buildBranchFilter(query)

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },

  async invite(
    payload: { email: string; full_name: string; role: "doctor" | "staff"; branch_id?: string | null },
  ): Promise<ApiResponse<Credentials>> {
    // Account creation needs the secret key, so it runs in the invite-staff
    // Edge Function. The clinic is taken from the caller's profile server-side.
    const { data, error } = await callFunction<Credentials>("invite-staff", payload);
    if (error || !data) return { data: null, error: error ?? "Failed to create the account" };
    // Return the temp password so admin can share it
    return { data: { email: data.email ?? payload.email, password: data.password }, error: null };
  },

  // Everyone's email and last sign-in (emails live in the auth system, not in profiles)
  async getDetails(): Promise<ApiResponse<MemberDetails[]>> {
    const { data, error } = await callFunction<{ details: MemberDetails[] }>("manage-staff", { action: "details" });
    if (error || !data) return { data: null, error: error ?? "Could not load member details" };
    return { data: data.details, error: null };
  },

  // A new temporary password; the old one stops working immediately
  async resetPassword(userId: string): Promise<ApiResponse<Credentials>> {
    const { data, error } = await callFunction<Credentials>("manage-staff", { action: "reset_password", user_id: userId });
    if (error || !data) return { data: null, error: error ?? "Could not reset the password" };
    return { data, error: null };
  },

  // Deactivate = locked out at once, history kept; reactivate = back to normal
  async setActive(userId: string, active: boolean): Promise<ApiResponse<null>> {
    const { error } = await callFunction("manage-staff", { action: "set_active", user_id: userId, active });
    return { data: null, error };
  },

  async update(
    userId: string,
    changes: { full_name: string; role: "doctor" | "staff"; branch_id: string | null },
  ): Promise<ApiResponse<null>> {
    const { error } = await supabase.rpc("update_staff_member", {
      p_user_id: userId,
      p_full_name: changes.full_name,
      p_role: changes.role,
      p_branch_id: changes.branch_id,
    });
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },

  // Detaching a user from the clinic is a server function: clinic_id can't be
  // changed from the browser, and the server checks the caller is this clinic's admin.
  async remove(_clinicId: string, userId: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.rpc("remove_staff", { p_user_id: userId });

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
