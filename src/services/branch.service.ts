import { supabase } from "./supabase";
import type { Branch, ApiResponse } from "@/types";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

/** Ensure the slug is unique within this clinic, appending -2, -3… if needed */
async function ensureUniqueBranchSlug(
  clinicId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    let q = supabase
      .from("branches")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("slug", slug);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

export const branchService = {
  async getAll(clinicId: string): Promise<ApiResponse<Branch[]>> {
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },

  /** Look up a branch by its slug within a clinic — used by the public booking page */
  async getBySlug(
    clinicId: string,
    branchSlug: string,
  ): Promise<ApiResponse<Branch>> {
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("slug", branchSlug)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async create(
    clinicId: string,
    payload: {
      name: string;
      address?: string;
      contact_number?: string;
      slug?: string;
    },
  ): Promise<ApiResponse<Branch>> {
    const baseSlug = payload.slug
      ? generateSlug(payload.slug)
      : generateSlug(payload.name);
    const slug = await ensureUniqueBranchSlug(clinicId, baseSlug);

    const { data, error } = await supabase
      .from("branches")
      .insert({ clinic_id: clinicId, ...payload, slug })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async update(
    clinicId: string,
    branchId: string,
    payload: {
      name?: string;
      address?: string;
      contact_number?: string;
      slug?: string;
    },
  ): Promise<ApiResponse<Branch>> {
    // If slug is being changed, re-validate uniqueness
    let finalPayload: typeof payload & { slug?: string } = { ...payload };
    if (payload.slug) {
      const baseSlug = generateSlug(payload.slug);
      finalPayload.slug = await ensureUniqueBranchSlug(
        clinicId,
        baseSlug,
        branchId,
      );
    } else if (payload.name && !payload.slug) {
      // Auto-regenerate slug from new name only if admin didn't set one manually
      // (leave existing slug alone — changing name shouldn't silently break URLs)
    }

    const { data, error } = await supabase
      .from("branches")
      .update(finalPayload)
      .eq("clinic_id", clinicId)
      .eq("id", branchId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async remove(clinicId: string, branchId: string): Promise<ApiResponse<null>> {
    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("id", branchId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
