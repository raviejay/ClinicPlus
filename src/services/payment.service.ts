import { supabase } from "./supabase";
import type { Payment, PaymentMethod, ApiResponse } from "@/types";
import { useBranchFilter } from "@/composables/useBranchFilter";
import { utcBounds, type DateRange } from "@/utils/revenue";

export type PaymentWithDetails = Payment & {
  patients: { full_name: string; contact_number: string } | null;
  appointments: {
    service_name: string | null;
    appointment_date: string;
    time_slot: string | null;
  } | null;
  recorder: { full_name: string | null } | null;
  changer: { full_name: string | null } | null;
};

export interface RevenueReport {
  totals: { net: number; count: number; patients: number; average: number };
  refunds: { amount: number; count: number };
  daily: { date: string; amount: number; count: number }[];
  by_method: { method: PaymentMethod; amount: number; count: number }[];
  by_doctor: { doctor_id: string | null; name: string; amount: number; count: number }[];
  by_service: { service: string; amount: number; count: number }[];
  by_branch: { branch_id: string | null; name: string; amount: number; count: number }[];
}

export interface UnpaidAppointment {
  appointment_id: string;
  appointment_date: string;
  time_slot: string | null;
  patient_id: string;
  patient_name: string;
  contact_number: string;
  service_name: string | null;
  doctor_name: string | null;
  branch_id: string | null;
}

const WITH_DETAILS =
  "*, patients(full_name, contact_number), appointments(service_name, appointment_date, time_slot), " +
  "recorder:profiles!payments_recorded_by_fkey(full_name), changer:profiles!payments_status_changed_by_fkey(full_name)";

export const paymentService = {
  // The database sets the time, the receipt number and who recorded it.
  async create(data: {
    clinic_id: string;
    patient_id: string;
    appointment_id?: string;
    branch_id?: string | null;
    amount: number;
    payment_method: PaymentMethod;
    description?: string;
    reference?: string;
    notes?: string;
  }): Promise<ApiResponse<Payment>> {
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({ ...data, status: "paid" })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: payment as Payment, error: null };
  },

  // Payments in a range of Manila dates, newest first (latest 500).
  async getRange(
    clinicId: string,
    range: DateRange,
    limit = 500,
  ): Promise<ApiResponse<PaymentWithDetails[]>> {
    const { buildBranchFilter } = useBranchFilter();
    const { start, end } = utcBounds(range);

    let query = supabase
      .from("payments")
      .select(WITH_DETAILS)
      .eq("clinic_id", clinicId)
      .gte("paid_at", start)
      .lt("paid_at", end);

    query = buildBranchFilter(query);

    const { data, error } = await query
      .order("paid_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: (data as any) ?? [], error: null };
  },

  /**
   * All payments for a single patient, most recent first.
   * Used by the patient chart view (PatientDetailPage.vue).
   */
  async getByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<ApiResponse<Payment[]>> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId)
      .order("paid_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data as any) ?? [], error: null };
  },

  // Totals, daily trend and breakdowns for a range, computed in one database call.
  async getReport(range: DateRange): Promise<ApiResponse<RevenueReport>> {
    const { isViewingAll, branchId } = useBranchFilter();
    const { data, error } = await supabase.rpc("get_revenue_report", {
      p_from: range.from,
      p_to: range.to,
      p_all_branches: isViewingAll.value,
      p_branch_id: branchId.value,
    });

    if (error) return { data: null, error: error.message };
    return { data: data as RevenueReport, error: null };
  },

  // Completed visits that nobody has paid for yet.
  async getUnpaid(range: DateRange): Promise<ApiResponse<UnpaidAppointment[]>> {
    const { isViewingAll, branchId } = useBranchFilter();
    const { data, error } = await supabase.rpc("get_unpaid_appointments", {
      p_from: range.from,
      p_to: range.to,
      p_all_branches: isViewingAll.value,
      p_branch_id: branchId.value,
    });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as UnpaidAppointment[], error: null };
  },

  // Money given back after a valid payment. Admins only (enforced by the database).
  async refund(paymentId: string, reason: string): Promise<ApiResponse<Payment>> {
    const { data, error } = await supabase.rpc("refund_payment", {
      p_payment_id: paymentId,
      p_reason: reason,
    });
    if (error) return { data: null, error: error.message };
    return { data: data as Payment, error: null };
  },

  // A payment entered by mistake. Admins any time; the person who entered it within 15 minutes.
  async void(paymentId: string, reason: string): Promise<ApiResponse<Payment>> {
    const { data, error } = await supabase.rpc("void_payment", {
      p_payment_id: paymentId,
      p_reason: reason,
    });
    if (error) return { data: null, error: error.message };
    return { data: data as Payment, error: null };
  },

  // A completed visit that is free (follow-up, courtesy…): stop listing it as unpaid.
  async markNoCharge(appointmentId: string): Promise<ApiResponse<null>> {
    const { error } = await supabase
      .from("appointments")
      .update({ no_charge: true })
      .eq("id", appointmentId);

    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
