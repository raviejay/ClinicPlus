// Plan Restriction Enforcement Service
// Validates operations against clinic's subscription plan limits

import { supabase } from './supabase'
import type { ClinicPlan, ApiResponse } from '@/types'
import { useSubscriptionPlan } from '@/composables/useSubscriptionPlan'

export interface LimitCheck {
  allowed: boolean
  remaining: number
  max: number
  current: number
  planName: string
}

export const planRestrictionService = {
  // Check if clinic can add more patients
  async checkPatientLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const { limits } = useSubscriptionPlan(plan)
      
      // Count existing patients
      const { count, error: countError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

      if (countError) {
        return { 
          data: null, 
          error: `Failed to check patient count: ${countError.message}` 
        }
      }

      const current = count ?? 0
      const max = limits.value.maxPatients
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: remaining > 0,
          remaining,
          max,
          current,
          planName: plan.charAt(0).toUpperCase() + plan.slice(1)
        },
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking patient limit'
      }
    }
  },

  // Check if clinic can add more staff
  async checkStaffLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const { limits } = useSubscriptionPlan(plan)
      
      // Count existing staff (profiles with this clinic_id)
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('role', ['admin', 'doctor', 'staff'])

      if (countError) {
        return { 
          data: null, 
          error: `Failed to check staff count: ${countError.message}` 
        }
      }

      const current = count ?? 0
      const max = limits.value.maxStaff
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: remaining > 0,
          remaining,
          max,
          current,
          planName: plan.charAt(0).toUpperCase() + plan.slice(1)
        },
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking staff limit'
      }
    }
  },

  // Check if clinic can add more branches
  async checkBranchLimit(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<LimitCheck>> {
    try {
      const { limits } = useSubscriptionPlan(plan)
      
      // Count existing branches
      const { count, error: countError } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

      if (countError) {
        return { 
          data: null, 
          error: `Failed to check branch count: ${countError.message}` 
        }
      }

      const current = count ?? 0
      const max = limits.value.maxBranches
      const remaining = Math.max(0, max - current)

      return {
        data: {
          allowed: remaining > 0,
          remaining,
          max,
          current,
          planName: plan.charAt(0).toUpperCase() + plan.slice(1)
        },
        error: null
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error checking branch limit'
      }
    }
  },

  // Get all limits for a plan
  async getAllLimits(clinicId: string, plan: ClinicPlan): Promise<ApiResponse<{
    patients: LimitCheck
    staff: LimitCheck
    branches: LimitCheck
  }>> {
    const patientCheck = await this.checkPatientLimit(clinicId, plan)
    const staffCheck = await this.checkStaffLimit(clinicId, plan)
    const branchCheck = await this.checkBranchLimit(clinicId, plan)

    if (patientCheck.error || staffCheck.error || branchCheck.error) {
      return {
        data: null,
        error: patientCheck.error || staffCheck.error || branchCheck.error || 'Failed to check limits'
      }
    }

    return {
      data: {
        patients: patientCheck.data!,
        staff: staffCheck.data!,
        branches: branchCheck.data!
      },
      error: null
    }
  }
}