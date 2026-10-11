import { supabase } from "./supabase";
import type { Appointment, ApiResponse, Queue } from "@/types";
import { useBranchFilter } from "@/composables/useBranchFilter";
import { notificationService } from "./notification.service";
import { queueService } from "./queue.service";

async function maybeSendConfirmationEmail(
  appointmentId: string,
  status: Appointment["status"],
) {
  if (status !== "confirmed") return;
  await notificationService.sendAppointmentConfirmation(appointmentId);
}

export const appointmentService = {
  async create(data: {
    clinic_id: string;
    branch_id?: string;
    patient_id: string;
    doctor_id?: string;
    appointment_date: string;
    time_slot?: string;
    service_category?: string;
    service_name?: string;
    notes?: string;
    status?: Appointment["status"];
  }): Promise<ApiResponse<Appointment>> {
    const status = data.status ?? "confirmed";
    const { data: appt, error } = await supabase
      .from("appointments")
      .insert({ ...data, status })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    if (appt) await maybeSendConfirmationEmail(appt.id, status);
    return { data: appt, error: null };
  },

  async getAll(
    clinicId: string,
    filters?: {
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      doctor_id?: string;
    },
  ): Promise<
    ApiResponse<
      (Appointment & {
        patients: { full_name: string; contact_number: string } | null;
        profiles: { full_name: string | null } | null;
      })[]
    >
  > {
    const { buildBranchFilter } = useBranchFilter();
    let query = supabase
      .from("appointments")
      .select("*, patients(full_name, contact_number), profiles(full_name)")
      .eq("clinic_id", clinicId);

    query = buildBranchFilter(query);

    if (filters?.date) query = query.eq("appointment_date", filters.date);
    if (filters?.dateFrom)
      query = query.gte("appointment_date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("appointment_date", filters.dateTo);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.doctor_id) query = query.eq("doctor_id", filters.doctor_id);

    const { data, error } = await query
      .order("appointment_date", { ascending: true })
      .order("time_slot", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as any) ?? [], error: null };
  },

  /**
   * All appointments for a single patient, most recent first.
   * Used by the patient chart view (PatientDetailPage.vue).
   */
  async getByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<
    ApiResponse<
      (Appointment & {
        profiles: { full_name: string | null } | null;
      })[]
    >
  > {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, profiles(full_name)")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data as any) ?? [], error: null };
  },

  async getToday(clinicId: string): Promise<
    ApiResponse<
      (Appointment & {
        patients: { full_name: string; contact_number: string } | null;
        profiles: { full_name: string | null } | null;
      })[]
    >
  > {
    const today = new Date().toISOString().split("T")[0];
    return this.getAll(clinicId, { date: today });
  },

  async updateStatus(
    clinicId: string,
    appointmentId: string,
    status: Appointment["status"],
  ): Promise<ApiResponse<Appointment>> {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("clinic_id", clinicId)
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    if (data) await maybeSendConfirmationEmail(data.id, status);
    return { data, error: null };
  },

  /**
   * Check In a confirmed appointment.
   *
   * Correct status flow:
   *   confirmed → [Check In clicked] → in_queue → [Queue Done] → completed
   *
   * On check-in:
   *   1. Appointment status → 'in_queue'  (NOT completed yet)
   *   2. Queue entry created as 'waiting' with appointment_id linked
   *
   * The appointment only becomes 'completed' when the queue entry is marked done.
   * That final step is handled by QueuePage.vue → markDone() → queue.service.markDoneWithAppointment()
   */
  async checkIn(
    clinicId: string,
    appointment: Appointment,
  ): Promise<ApiResponse<Queue>> {
    // Step 1: Mark appointment as in_queue (patient is now physically in the clinic)
    const { error: apptError } = await this.updateStatus(
      clinicId,
      appointment.id,
      "in_queue",
    );
    if (apptError) {
      return {
        data: null,
        error: `Failed to update appointment: ${apptError}`,
      };
    }

    // Step 2: Create queue entry linked to this appointment
    const { data: queueEntry, error: queueError } =
      await queueService.addToQueue({
        clinic_id: clinicId,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id ?? undefined,
        branch_id: appointment.branch_id ?? undefined,
      });

    if (queueError || !queueEntry) {
      // Roll back appointment status if queue creation failed
      await this.updateStatus(clinicId, appointment.id, "confirmed");
      return {
        data: null,
        error: queueError ?? "Failed to create queue entry",
      };
    }

    return { data: queueEntry, error: null };
  },

  async getTodayCount(clinicId: string): Promise<number> {
    const { buildBranchFilter } = useBranchFilter();
    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today);

    query = buildBranchFilter(query);
    const { count } = await query;
    return count ?? 0;
  },

  // Public booking: one server call finds/creates the patient, enforces plan
  // limits and creates the appointment. Anonymous visitors never touch tables.
  async bookPublic(data: {
    clinic_id: string;
    branch_id?: string;
    full_name: string;
    contact_number: string;
    email?: string;
    appointment_date: string;
    time_slot?: string;
    doctor_id?: string;
    service_category?: string;
    service_name?: string;
    notes?: string;
  }): Promise<ApiResponse<{ appointment_id: string }>> {
    const { data: appointmentId, error } = await supabase.rpc(
      "book_public_appointment",
      {
        p_clinic_id: data.clinic_id,
        p_branch_id: data.branch_id ?? null,
        p_full_name: data.full_name,
        p_contact_number: data.contact_number,
        p_email: data.email ?? null,
        p_appointment_date: data.appointment_date,
        p_time_slot: data.time_slot ?? null,
        p_doctor_id: data.doctor_id ?? null,
        p_service_category: data.service_category ?? null,
        p_service_name: data.service_name ?? null,
        p_notes: data.notes ?? null,
      },
    );

    if (error) return { data: null, error: error.message };
    await maybeSendConfirmationEmail(appointmentId as string, "confirmed");
    return { data: { appointment_id: appointmentId as string }, error: null };
  },

  // How many active bookings each time slot has on a date (staff view, branch-filtered).
  // Informational: staff may book any time, e.g. a walk-in.
  async getSlotLoad(
    clinicId: string,
    date: string,
  ): Promise<ApiResponse<{ time_slot: string; doctor_id: string | null }[]>> {
    const { buildBranchFilter } = useBranchFilter();
    let query = supabase
      .from("appointments")
      .select("time_slot, doctor_id")
      .eq("clinic_id", clinicId)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed", "in_queue"])
      .not("time_slot", "is", null);

    query = buildBranchFilter(query);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as { time_slot: string; doctor_id: string | null }[], error: null };
  },

  // Which time slots are already taken on a date (for this doctor, if one is chosen),
  // plus the clinic's current date/time so past slots can be grayed out.
  async getPublicAvailability(params: {
    clinic_id: string;
    date: string;
    doctor_id?: string;
    branch_id?: string;
  }): Promise<ApiResponse<{ booked: string[]; today: string; minutes: number }>> {
    const { data, error } = await supabase.rpc("get_public_availability", {
      p_clinic_id: params.clinic_id,
      p_date: params.date,
      p_doctor_id: params.doctor_id ?? null,
      p_branch_id: params.branch_id ?? null,
    });

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "Clinic not found" };
    return {
      data: data as { booked: string[]; today: string; minutes: number },
      error: null,
    };
  },

  async getPublicDoctors(clinicId: string) {
    const { data, error } = await supabase.rpc("get_public_doctors", {
      p_clinic_id: clinicId,
    });

    if (error) return [];
    return (data ?? []) as { id: string; full_name: string }[];
  },

  async getDoctors(clinicId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("clinic_id", clinicId)
      .eq("role", "doctor");

    if (error) return [];
    return data ?? [];
  },
};