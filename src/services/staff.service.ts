import { supabase } from "./supabase";
import type { Profile, ApiResponse } from "@/types";
import { useBranchFilter } from "@/composables/useBranchFilter";

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
    payload: { email: string; full_name: string; role: "doctor" | "staff" },
  ): Promise<ApiResponse<{ password: string }>> {
    // Account creation needs the secret key, so it runs in the invite-staff
    // Edge Function. The clinic is taken from the caller's profile server-side.
    const { data, error } = await supabase.functions.invoke("invite-staff", {
      body: payload,
    });

    if (error) {
      // Surface the function's own error message when it returned one
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      return { data: null, error: body?.error ?? error.message };
    }
    if (data?.error) return { data: null, error: data.error };

    // Return the temp password so admin can share it
    return { data: { password: data.password }, error: null };
  },

  async remove(clinicId: string, userId: string): Promise<ApiResponse<null>> {
    const { error } = await supabase
      .from("profiles")
      .update({ clinic_id: null })
      .eq("id", userId)
      .eq("clinic_id", clinicId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
