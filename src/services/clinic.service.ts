import { supabase } from "./supabase";
import type {
  Clinic,
  ClinicSettings,
  ClinicBranding,
  ClinicSetupPayload,
  ApiResponse,
} from "@/types";

export const clinicService = {
  // Runs server-side (create_clinic): the clinic, its settings/branding, the admin
  // profile and the 14-day Premium trial are created in one transaction.
  async createClinic(
    _userId: string,
    payload: ClinicSetupPayload,
  ): Promise<ApiResponse<Clinic>> {
    const { data, error } = await supabase.rpc("create_clinic", {
      p_name: payload.name,
      p_email: payload.email ?? null,
    });
    if (error) return { data: null, error: error.message };
    return { data: data as Clinic, error: null };
  },

  async getClinic(clinicId: string): Promise<ApiResponse<Clinic>> {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .single();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async getAllClinics(): Promise<ApiResponse<Clinic[]>> {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async getClinicSettings(
    clinicId: string,
  ): Promise<ApiResponse<ClinicSettings>> {
    const { data, error } = await supabase
      .from("clinic_settings")
      .select("*")
      .eq("clinic_id", clinicId)
      .single();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async getClinicBranding(
    clinicId: string,
  ): Promise<ApiResponse<ClinicBranding>> {
    const { data, error } = await supabase
      .from("clinic_branding")
      .select("*")
      .eq("clinic_id", clinicId)
      .single();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async updateBranding(
    clinicId: string,
    payload: Partial<ClinicBranding>,
  ): Promise<ApiResponse<ClinicBranding>> {
    const { data, error } = await supabase
      .from("clinic_branding")
      .update(payload)
      .eq("clinic_id", clinicId)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async uploadLogo(clinicId: string, file: File): Promise<ApiResponse<string>> {
    const ext = file.name.split(".").pop();
    const path = `logos/${clinicId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("clinic-assets")
      .upload(path, file, { upsert: true });
    if (uploadError) return { data: null, error: uploadError.message };
    const { data } = supabase.storage.from("clinic-assets").getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  },

  // Used for public booking page — public RPC, exposes only booking-safe fields
  async getClinicBySlug(
    slug: string,
  ): Promise<
    ApiResponse<
      Clinic & {
        clinic_branding: ClinicBranding | null;
        clinic_settings: ClinicSettings | null;
      }
    >
  > {
    const { data, error } = await supabase.rpc("get_public_clinic", {
      p_slug: slug,
    });
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "Clinic not found" };
    return {
      data: data as Clinic & {
        clinic_branding: ClinicBranding | null;
        clinic_settings: ClinicSettings | null;
      },
      error: null,
    };
  },
};
