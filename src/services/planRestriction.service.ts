// Plan Restriction Enforcement Service
// Validates operations against the clinic's subscription plan limits.
// Uses getLimits() from @/utils/planLimits — NOT the Vue composable,
// which must only be called inside component setup().

import { supabase } from './supabase'
import { usageService } from './usage.service'
import type { ClinicPlan, ApiResponse } from '@/types'
import { getLimits, getPlanName } from '@/utils/planLimits'

export interface LimitCheck {
  allowed: boolean
  remaining: number
  max: number
  current: number
  planName: string
}

export const planRestrictionService = {
  /**
   * Checks new patients registered THIS MONTH against the plan's monthly limit.
   * e.g. Starter = max 100 new patients per month, resets each billing cycle.
   */
  async checkPatientLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const limits = getLimits(plan)

      const usageResult = await usageService.getMonthlyUsage(clinicId)
      if (usageResult.error) {
        return { data: null, error: `Failed to check monthly patient count: ${usageResult.error}` }
      }

      const current = usageResult.data?.new_patients_count ?? 0
      const max = limits.maxPatients
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: remaining > 0,
          remaining,
          max,
          current,
          planName: getPlanName(plan),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking patient limit',
      }
    }
  },

  // Starter = admin login only (1 total). Pro/Premium cap total dashboard users.
  async checkStaffLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const limits = getLimits(plan)

      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('role', ['admin', 'doctor', 'staff'])

      if (countError) {
        return { data: null, error: `Failed to check staff count: ${countError.message}` }
      }

      const current = count ?? 0
      const max = limits.maxStaff
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: current < max,
          remaining,
          max,
          current,
          planName: getPlanName(plan),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking staff limit',
      }
    }
  },

  async checkBranchLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const limits = getLimits(plan)

      const { count, error: countError } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

      if (countError) {
        return { data: null, error: `Failed to check branch count: ${countError.message}` }
      }

      const current = count ?? 0
      const max = limits.maxBranches
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: max > 0 && remaining > 0,
          remaining,
          max,
          current,
          planName: getPlanName(plan),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking branch limit',
      }
    }
  },

  async getAllLimits(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<{
    patients: LimitCheck
    staff: LimitCheck
    branches: LimitCheck
  }>> {
    const [patientCheck, staffCheck, branchCheck] = await Promise.all([
      this.checkPatientLimit(clinicId, plan),
      this.checkStaffLimit(clinicId, plan),
      this.checkBranchLimit(clinicId, plan),
    ])

    if (patientCheck.error || staffCheck.error || branchCheck.error) {
      return {
        data: null,
        error: patientCheck.error ?? staffCheck.error ?? branchCheck.error ?? 'Failed to check limits',
      }
    }

    return {
      data: {
        patients: patientCheck.data!,
        staff: staffCheck.data!,
        branches: branchCheck.data!,
      },
      error: null,
    }
  },
}
