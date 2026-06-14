import { supabase } from './supabase'
import type { ClinicService, ClinicServiceCategory, ApiResponse } from '@/types'

/**
 * Groups flat ClinicService rows into ClinicServiceCategory objects
 * (one entry per category with all services listed under it).
 */
function groupByCategory(rows: ClinicService[]): ClinicServiceCategory[] {
  const map = new Map<string, ClinicServiceCategory>()
  for (const row of rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        id: row.category_id,
        label: row.category_name,
        icon: row.category_icon,
        services: [],
      })
    }
    map.get(row.category_id)!.services.push(row.service_name)
  }
  return Array.from(map.values())
}

export const clinicServicesService = {
  /** Fetch all active services for a clinic, grouped by category */
  async getCategories(clinicId: string): Promise<ApiResponse<ClinicServiceCategory[]>> {
    const { data, error } = await supabase
      .from('clinic_services')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('sort_order')
      .order('category_name')
      .order('service_name')

    if (error) return { data: null, error: error.message }
    return { data: groupByCategory(data ?? []), error: null }
  },

  /** Fetch all services (including inactive) for the settings management UI */
  async getAll(clinicId: string): Promise<ApiResponse<ClinicService[]>> {
    const { data, error } = await supabase
      .from('clinic_services')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('category_name')
      .order('sort_order')
      .order('service_name')

    if (error) return { data: null, error: error.message }
    return { data: data ?? [], error: null }
  },

  /** Add a new service entry */
  async addService(payload: {
    clinic_id: string
    category_id: string
    category_name: string
    category_icon: string
    service_name: string
    sort_order?: number
  }): Promise<ApiResponse<ClinicService>> {
    const { data, error } = await supabase
      .from('clinic_services')
      .insert({ ...payload, is_active: true })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  /** Update a service (name, active state, etc.) */
  async updateService(
    id: string,
    updates: Partial<Pick<ClinicService, 'service_name' | 'category_name' | 'category_icon' | 'is_active' | 'sort_order'>>
  ): Promise<ApiResponse<ClinicService>> {
    const { data, error } = await supabase
      .from('clinic_services')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  /** Permanently delete a service row */
  async deleteService(id: string): Promise<ApiResponse<boolean>> {
    const { error } = await supabase
      .from('clinic_services')
      .delete()
      .eq('id', id)

    if (error) return { data: null, error: error.message }
    return { data: true, error: null }
  },
}