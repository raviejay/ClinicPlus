import { supabaseAdmin } from "./supabase.admin";
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
    clinicId: string,
    payload: { email: string; full_name: string; role: "doctor" | "staff" },
  ): Promise<ApiResponse<{ password: string }>> {
    // Generate a simple readable temp password
    const tempPassword = "ClinicGo@" + Math.floor(1000 + Math.random() * 9000);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name },
    });

    if (error) return { data: null, error: error.message };
    if (!data.user) return { data: null, error: "Failed to create user" };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: data.user.id,
        clinic_id: clinicId,
        full_name: payload.full_name,
        role: payload.role,
      });

    if (profileError) return { data: null, error: profileError.message };

    // Return the temp password so admin can share it
    return { data: { password: tempPassword }, error: null };
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
