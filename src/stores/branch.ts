import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { branchService } from '@/services/branch.service'
import { useAuthStore } from '@/stores/auth'
import type { Branch } from '@/types'

export const useBranchStore = defineStore('branch', () => {
  const branches = ref<Branch[]>([])
  const activeBranchId = ref<string | null>(null) // null = clinic main branch

  // The "virtual" main branch built from the clinic itself
  const mainBranch = computed(() => {
    const authStore = useAuthStore()
    if (!authStore.clinic) return null
    return {
      id: null, // null signals "main / clinic-level"
      clinic_id: authStore.clinic.id,
      name: authStore.clinic.name,
      address: null,
      contact_number: null,
      isMain: true,
    }
  })

  // All selectable locations: clinic (main) + additional branches
  const allBranches = computed(() => [
    ...(mainBranch.value ? [mainBranch.value] : []),
    ...branches.value,
  ])

  const activeBranch = computed(() =>
    activeBranchId.value === null
      ? mainBranch.value        // null = main branch (the clinic)
      : branches.value.find(b => b.id === activeBranchId.value) ?? null
  )

  const isMultiBranch = computed(() => branches.value.length > 0) // true if ANY extra branches exist

  // Branch ID to inject into queries.
  // null means "main branch / clinic level" (branch_id IS NULL in DB)
  const queryBranchId = computed((): string | null => {
    const authStore = useAuthStore()

    // Non-admins: locked to their assigned branch_id (null = main branch)
    if (!authStore.isAdmin) {
      return authStore.profile?.branch_id ?? null
    }

    // Admins: whatever is selected (null = main branch)
    return activeBranchId.value
  })

  // Whether we're viewing "all branches" — only admins in multi-branch can do this
  const isViewingAll = computed(() => {
    const authStore = useAuthStore()
    return authStore.isAdmin && isMultiBranch.value && activeBranchId.value === 'ALL'
  })

  async function loadBranches() {
    const authStore = useAuthStore()
    if (!authStore.clinic?.id) return

    const { data } = await branchService.getAll(authStore.clinic.id)
    branches.value = data ?? []

    // Non-admins: always lock to their profile's branch_id, no selection needed
    if (!authStore.isAdmin) {
      activeBranchId.value = authStore.profile?.branch_id ?? null
      return
    }

    // Single location (no extra branches): always on main
    if (branches.value.length === 0) {
      activeBranchId.value = null
      return
    }

    // Try restoring admin's last selection
    const saved = localStorage.getItem(`cliniko_branch_${authStore.clinic.id}`)
    if (saved === 'ALL' || saved === null) {
      activeBranchId.value = saved === 'ALL' ? 'ALL' : null
    } else if (branches.value.find(b => b.id === saved)) {
      activeBranchId.value = saved
    } else {
      // Saved branch no longer exists, fall back to main
      activeBranchId.value = null
    }
  }

  function selectBranch(branchId: string | null | 'ALL') {
    const authStore = useAuthStore()
    if (!authStore.isAdmin) return // non-admins cannot switch

    activeBranchId.value = branchId === 'ALL' ? 'ALL' : branchId

    if (authStore.clinic?.id) {
      if (branchId) {
        localStorage.setItem(`cliniko_branch_${authStore.clinic.id}`, branchId)
      } else {
        // null = main branch
        localStorage.removeItem(`cliniko_branch_${authStore.clinic.id}`)
      }
    }
  }

  function reset() {
    branches.value = []
    activeBranchId.value = null
  }

  return {
    branches, allBranches, activeBranchId, activeBranch,
    mainBranch, isMultiBranch, isViewingAll, queryBranchId,
    loadBranches, selectBranch, reset,
  }
})