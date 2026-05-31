// ============================================================
// PLAN LIMITS — pure data utility (no Vue composable context)
// Import this in services and anywhere outside setup().
// The composable useSubscriptionPlan wraps this with reactivity
// for component use.
// ============================================================

import type { ClinicPlan } from '@/types'

export interface PlanLimits {
  maxPatients: number
  /** Total dashboard logins (admin + doctors + staff). Starter = 1 (admin only). */
  maxStaff: number
  maxBranches: number
  queueEnabled: boolean
  revenueTrackingEnabled: boolean
  emailNotificationsEnabled: boolean
  customBrandingEnabled: boolean
  fullAnalyticsEnabled: boolean
  prioritySupportEnabled: boolean
}

export const PLAN_LIMITS: Record<ClinicPlan, PlanLimits> = {
  starter: {
    maxPatients: 100,
    maxStaff: 1,
    maxBranches: 0,
    queueEnabled: false,
    revenueTrackingEnabled: false,
    emailNotificationsEnabled: false,
    customBrandingEnabled: false,
    fullAnalyticsEnabled: false,
    prioritySupportEnabled: false,
  },
  pro: {
    maxPatients: 1000,
    maxStaff: 5,
    maxBranches: 0,
    queueEnabled: true,
    revenueTrackingEnabled: true,
    emailNotificationsEnabled: true,
    customBrandingEnabled: false,
    fullAnalyticsEnabled: false,
    prioritySupportEnabled: false,
  },
  premium: {
    maxPatients: 999999,
    maxStaff: 999999,
    maxBranches: 5,
    queueEnabled: true,
    revenueTrackingEnabled: true,
    emailNotificationsEnabled: true,
    customBrandingEnabled: true,
    fullAnalyticsEnabled: true,
    prioritySupportEnabled: true,
  },
}

/** Pure helper — returns limits for a plan without any Vue reactivity. */
export function getLimits(plan: ClinicPlan): PlanLimits {
  return PLAN_LIMITS[plan]
}

export function getPlanName(plan: ClinicPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}
