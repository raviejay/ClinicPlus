import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import type { ClinicPlan } from "@/types";

export function useClinic() {
  const authStore = useAuthStore();

  const clinic = computed(() => authStore.clinic);
  const settings = computed(() => authStore.clinicSettings);
  const profile = computed(() => authStore.profile);
  const plan = computed(() => authStore.clinic?.plan ?? "starter");

  const isTrialActive = computed(() => {
    if (!clinic.value?.is_trial || !clinic.value?.trial_ends_at) return false;
    return new Date(clinic.value.trial_ends_at) > new Date();
  });

  const trialDaysLeft = computed(() => {
    if (!clinic.value?.trial_ends_at) return 0;
    const diff = new Date(clinic.value.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  const trialExpired = computed(
    () => clinic.value?.is_trial && !isTrialActive.value,
  );

  /**
   * True when the clinic has no active paid access — trial ran out and
   * they never subscribed (clinic.is_trial is only flipped to false once
   * a real plan is chosen, see SuperAdminDashboard.vue / billing flow).
   * Read-only clinics can still see their existing data, but every
   * create/write action is blocked (enforced in router/index.ts and in
   * the "Add"/"New" buttons on each list page).
   */
  const isReadOnly = computed(() => trialExpired.value);

  // Feature gating per plan
  const canUseFeature = (feature: string): boolean => {
    const p = plan.value as ClinicPlan;

    // No paid access at all — every plan-gated feature is blocked,
    // full stop, regardless of which plan tier `p` happens to say.
    if (isReadOnly.value) return false;

    // Trial gets full Premium access
    if (isTrialActive.value) return true;

    const gates: Record<string, ClinicPlan[]> = {
      queue: ["pro", "premium"],
      revenue: ["pro", "premium"],
      email_notifications: ["pro", "premium"],
      doctor_selection: ["pro", "premium"],
      multi_branch: ["premium"],
      full_analytics: ["premium"],
      custom_branding: ["premium"],
      priority_support: ["premium"],
    };

    const allowed = gates[feature];
    if (!allowed) return true; // unknown features are open
    return allowed.includes(p);
  };

  const planLabel = computed(
    () =>
      ({
        starter: "Starter",
        pro: "Pro",
        premium: "Premium",
      })[plan.value] ?? "Starter",
  );

  const planColor = computed(
    () =>
      ({
        starter: "bg-slate-100 text-slate-600",
        pro: "bg-sky-100 text-sky-700",
        premium: "bg-purple-100 text-purple-700",
      })[plan.value] ?? "bg-slate-100 text-slate-600",
  );

  return {
    clinic,
    settings,
    profile,
    plan,
    planLabel,
    planColor,
    isTrialActive,
    trialDaysLeft,
    trialExpired,
    isReadOnly,
    canUseFeature,
  };
}
