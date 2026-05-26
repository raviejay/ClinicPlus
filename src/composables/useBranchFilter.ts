import { computed, watch, type Ref } from 'vue'
import { useBranchStore } from '@/stores/branch'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

/**
 * Composable for applying branch filtering to data queries.
 *
 * Usage in services:
 *   const { buildBranchFilter } = useBranchFilter()
 *   let query = supabase.from('patients').select('*').eq('clinic_id', clinicId)
 *   query = buildBranchFilter(query)
 *   const { data } = await query
 *
 * Usage in pages (for reactive re-fetching):
 *   const { branchId, watchBranchChange } = useBranchFilter()
 *   watchBranchChange(() => { loadData() })
 */
export function useBranchFilter() {
  const branchStore = useBranchStore()

  // Current branch ID to filter by (reactive)
  const branchId = computed(() => branchStore.queryBranchId)

  // Whether we're viewing all branches (no filter)
  const isViewingAll = computed(() => branchStore.isViewingAll)

  /**
   * Apply branch filter to a Supabase query.
   * Returns the modified query with appropriate branch filtering.
   *
   * Rules:
   * - If isViewingAll: no filter (admins see all)
   * - If branchId is null: filter .is('branch_id', null) (main branch)
   * - Otherwise: filter .eq('branch_id', branchId) (specific branch)
   */
  function buildBranchFilter<T extends PostgrestFilterBuilder<any, any, any>>(
    query: T
  ): T {
    // Admins viewing all: no branch filter
    if (isViewingAll.value) {
      return query
    }

    // null means main branch (records where branch_id IS NULL)
    if (branchId.value === null) {
      return query.is('branch_id', null) as T
    }

    // Specific branch UUID
    return query.eq('branch_id', branchId.value) as T
  }

  /**
   * Watch for branch changes and trigger a callback.
   * Useful in pages to re-fetch data when branch selection changes.
   */
  function watchBranchChange(callback: () => void | Promise<void>) {
    watch(
      () => branchId.value,
      callback,
      { immediate: false }
    )
  }

  return {
    branchId,
    isViewingAll,
    buildBranchFilter,
    watchBranchChange,
  }
}
