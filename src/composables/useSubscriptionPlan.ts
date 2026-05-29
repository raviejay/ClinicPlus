// Subscription Plan Composable
// Manages plan limits, feature gates, and restrictions based on clinic's current plan

import { ref, computed } from 'vue'
import type { ClinicPlan } from '@/types'

export interface PlanLimits {
  maxPatients: number
  maxStaff: number
  maxBranches: number
  queueEnabled: boolean
  revenueTrackingEnabled: boolean
  smsEnabled: boolean
  customBrandingEnabled: boolean
  exportEnabled: boolean
  multiLayoutThemes: number
  apiAccessEnabled: boolean
  prioritySupportEnabled: boolean
}

const PLAN_LIMITS: Record<ClinicPlan, PlanLimits> = {
  starter: {
    maxPatients: 50,
    maxStaff: 1,
    maxBranches: 1,
    queueEnabled: false,
    revenueTrackingEnabled: false,
    smsEnabled: false,
    customBrandingEnabled: false,
    exportEnabled: false,
    multiLayoutThemes: 1,
    apiAccessEnabled: false,
    prioritySupportEnabled: false,
  },
  pro: {
    maxPatients: 500,
    maxStaff: 5,
    maxBranches: 1,
    queueEnabled: true,
    revenueTrackingEnabled: true,
    smsEnabled: true,
    customBrandingEnabled: false,
    exportEnabled: false,
    multiLayoutThemes: 3,
    apiAccessEnabled: false,
    prioritySupportEnabled: false,
  },
  premium: {
    maxPatients: 999999,
    maxStaff: 999999,
    maxBranches: 999999,
    queueEnabled: true,
    revenueTrackingEnabled: true,
    smsEnabled: true,
    customBrandingEnabled: true,
    exportEnabled: true,
    multiLayoutThemes: 4,
    apiAccessEnabled: true,
    prioritySupportEnabled: true,
  },
}

export function useSubscriptionPlan(plan: ClinicPlan) {
  const currentPlan = ref<ClinicPlan>(plan)
  
  const limits = computed(() => PLAN_LIMITS[currentPlan.value])

  // Feature gate checks
  const canAccessQueue = computed(() => limits.value.queueEnabled)
  const canAccessRevenueTracking = computed(() => limits.value.revenueTrackingEnabled)
  const canAccessSMS = computed(() => limits.value.smsEnabled)
  const canAccessCustomBranding = computed(() => limits.value.customBrandingEnabled)
  const canExportData = computed(() => limits.value.exportEnabled)
  const canAccessAPI = computed(() => limits.value.apiAccessEnabled)
  const hasPrioritySupport = computed(() => limits.value.prioritySupportEnabled)
  const canAddBranches = computed(() => limits.value.maxBranches > 1)

  // Limit checks
  const checkPatientLimit = (currentCount: number): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxPatients - currentCount
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining)
    }
  }

  const checkStaffLimit = (currentCount: number): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxStaff - currentCount
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining)
    }
  }

  const checkBranchLimit = (currentCount: number): { allowed: boolean; remaining: number } => {
    const remaining = limits.value.maxBranches - currentCount
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining)
    }
  }

  const getPlanName = () => {
    return currentPlan.value.charAt(0).toUpperCase() + currentPlan.value.slice(1)
  }

  return {
    currentPlan,
    limits,
    canAccessQueue,
    canAccessRevenueTracking,
    canAccessSMS,
    canAccessCustomBranding,
    canExportData,
    canAccessAPI,
    hasPrioritySupport,
    canAddBranches,
    checkPatientLimit,
    checkStaffLimit,
    checkBranchLimit,
    getPlanName,
  }
}
