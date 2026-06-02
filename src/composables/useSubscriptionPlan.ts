// Subscription Plan Composable
// Wraps PLAN_LIMITS with Vue reactivity for use inside components/setup().
// Services must use getLimits() from @/utils/planLimits directly.

import { ref, computed } from "vue";
import type { ClinicPlan } from "@/types";
import { PLAN_LIMITS, getPlanName } from "@/utils/planLimits";

export type { PlanLimits } from "@/utils/planLimits";
export { PLAN_LIMITS };

export function useSubscriptionPlan(plan: ClinicPlan) {
  const currentPlan = ref<ClinicPlan>(plan);

  const limits = computed(() => PLAN_LIMITS[currentPlan.value]);

  const canAccessQueue = computed(() => limits.value.queueEnabled);
  const canAccessRevenueTracking = computed(
    () => limits.value.revenueTrackingEnabled,
  );
  const canAccessEmailNotifications = computed(
    () => limits.value.emailNotificationsEnabled,
  );
  const canAccessCustomBranding = computed(
    () => limits.value.customBrandingEnabled,
  );
  const canAccessFullAnalytics = computed(
    () => limits.value.fullAnalyticsEnabled,
  );
  const hasPrioritySupport = computed(
    () => limits.value.prioritySupportEnabled,
  );
  const canAddBranches = computed(() => limits.value.maxBranches > 0);

  const checkPatientLimit = (
    currentCount: number,
  ): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxPatients - currentCount;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  };

  const checkStaffLimit = (
    currentCount: number,
  ): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxStaff - currentCount;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  };

  const checkBranchLimit = (
    currentCount: number,
  ): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxBranches - currentCount;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  };

  return {
    currentPlan,
    limits,
    canAccessQueue,
    canAccessRevenueTracking,
    canAccessEmailNotifications,
    canAccessCustomBranding,
    canAccessFullAnalytics,
    hasPrioritySupport,
    canAddBranches,
    checkPatientLimit,
    checkStaffLimit,
    checkBranchLimit,
    getPlanName: () => getPlanName(currentPlan.value),
  };
}
