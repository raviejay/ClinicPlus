<template>
  <div class="min-h-screen bg-[#F0F4F8] flex">

    <!-- SIDEBAR -->
    <aside :class="['hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 ease-in-out', sidebarCollapsed ? 'w-[68px]' : 'w-60']">
      <div :class="['flex items-center border-b border-gray-100 transition-all duration-300', sidebarCollapsed ? 'px-3 py-5 justify-center' : 'px-4 py-5 gap-3']">
  <AppLogo size="sm" :show-dot="true" :show-name="!sidebarCollapsed" class="shrink-0" />
  <button v-if="!sidebarCollapsed" @click="sidebarCollapsed = true" class="ml-auto rounded-lg p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0">
    <span class="material-icons text-base">chevron_left</span>
  </button>
</div>
      <div v-if="sidebarCollapsed" class="flex justify-center pt-2">
        <button @click="sidebarCollapsed = false" class="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600">
          <span class="material-icons text-base">chevron_right</span>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5" :class="sidebarCollapsed ? 'px-2' : 'px-3'">
        <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1">Operations</p>
        <div v-else class="my-1 mx-2 h-px bg-gray-100"></div>
        <RouterLink v-for="item in operationsNav" :key="item.to" :to="item.to" :title="sidebarCollapsed ? item.label : ''"
          :class="['flex items-center rounded-xl text-sm font-medium transition-all group relative', sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5', isActive(item.to) ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800']">
          <span class="material-icons shrink-0" style="font-size:18px">{{ item.icon }}</span>
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          <div v-if="sidebarCollapsed" class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 shadow-lg">{{ item.label }}</div>
        </RouterLink>

        <template v-if="authStore.isAdmin">
          <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">Management</p>
          <div v-else class="my-2 mx-2 h-px bg-gray-100"></div>
          <RouterLink v-for="item in managementNav" :key="item.to" :to="item.to" :title="sidebarCollapsed ? item.label : ''"
            :class="['flex items-center rounded-xl text-sm font-medium transition-all group relative', sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5', isActive(item.to) ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800']">
            <span class="material-icons shrink-0" style="font-size:18px">{{ item.icon }}</span>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            <div v-if="sidebarCollapsed" class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 shadow-lg">{{ item.label }}</div>
          </RouterLink>
        </template>

        <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">System</p>
        <div v-else class="my-2 mx-2 h-px bg-gray-100"></div>
        <RouterLink v-for="item in systemNav" :key="item.to" :to="item.to" :title="sidebarCollapsed ? item.label : ''"
          :class="['flex items-center rounded-xl text-sm font-medium transition-all group relative', sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5', isActive(item.to) ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800']">
          <span class="material-icons shrink-0" style="font-size:18px">{{ item.icon }}</span>
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          <div v-if="sidebarCollapsed" class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 shadow-lg">{{ item.label }}</div>
        </RouterLink>
      </nav>

      <div class="px-3 py-4 border-t border-gray-100">
        <div v-if="!sidebarCollapsed" class="mx-1 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 border border-sky-200 px-3 py-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span :class="['text-xs font-bold', planColor]">{{ planLabel }}</span>
          </div>
          <RouterLink to="/admin/settings" class="mt-2 block text-center text-[11px] font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-lg py-1.5 transition-colors">Upgrade Now ✦</RouterLink>
        </div>
        <div v-else class="flex justify-center">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" :title="planLabel"></span>
        </div>
      </div>
    </aside>

    <div :class="['flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-60']">

      <!-- TOP NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div class="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button class="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" @click="mobileMenuOpen = !mobileMenuOpen">
              <span class="material-icons">menu</span>
            </button>
            <div class="md:hidden"><AppLogo size="sm" :show-dot="true" :show-name="true" /></div>

            <!-- Branch selector: only show if multi-branch is enabled -->
            <div v-if="branchStore.isMultiBranch || authStore.isAdmin" class="relative">
              <button @click="branchDropdownOpen = !branchDropdownOpen"
                class="flex items-center gap-2 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
                <div class="hidden md:flex w-7 h-7 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                  <span class="material-icons text-slate-500" style="font-size:16px">store</span>
                </div>
                <div class="text-left">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-bold text-slate-800">
                      {{ branchStore.isViewingAll
                          ? authStore.clinic?.name
                          : (branchStore.activeBranch?.name ?? authStore.clinic?.name ?? 'Clinic') }}
                    </span>
                    <!-- All branches badge -->
                    <span v-if="branchStore.isViewingAll"
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      All
                    </span>
                    <!-- Main branch badge -->
                    <span v-else-if="!branchStore.activeBranchId"
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                      Main
                    </span>
                    <!-- Sub-branch badge -->
                    <span v-else
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600">
                      Branch
                    </span>
                  </div>
                </div>
                <span class="material-icons text-slate-400" style="font-size:16px">expand_more</span>
              </button>

              <!-- Branch dropdown -->
              <div v-if="branchDropdownOpen"
                class="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">Location</p>

                <!-- All Branches (admin + multi-branch only) -->
                <button v-if="authStore.isAdmin && branchStore.isMultiBranch"
                  @click="selectBranch('ALL')"
                  :class="['w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left',
                    branchStore.isViewingAll ? 'text-sky-600 font-bold' : 'text-slate-600 font-medium']">
                  <span :class="['w-2 h-2 rounded-full shrink-0', branchStore.isViewingAll ? 'bg-sky-500' : 'bg-gray-200']"></span>
                  <span class="flex-1">All Branches</span>
                  <span v-if="branchStore.isViewingAll" class="material-icons text-sky-500 text-sm">check</span>
                </button>

                <!-- Main branch (the clinic itself) -->
                <button @click="selectBranch(null)"
                  :class="['w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left',
                    !branchStore.isViewingAll && branchStore.activeBranchId === null
                      ? 'text-sky-600 font-bold'
                      : 'text-slate-600 font-medium']">
                  <span :class="['w-2 h-2 rounded-full shrink-0',
                    !branchStore.isViewingAll && branchStore.activeBranchId === null ? 'bg-sky-500' : 'bg-gray-200']"></span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="truncate">{{ authStore.clinic?.name }}</p>
                      <span class="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600 shrink-0">MAIN</span>
                    </div>
                  </div>
                  <span v-if="!branchStore.isViewingAll && branchStore.activeBranchId === null"
                    class="material-icons text-sky-500 text-sm">check</span>
                </button>

                <!-- Additional branches -->
                <button v-for="branch in branchStore.branches" :key="branch.id"
                  @click="selectBranch(branch.id)"
                  :class="['w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left',
                    branchStore.activeBranchId === branch.id ? 'text-sky-600 font-bold' : 'text-slate-600 font-medium']">
                  <span :class="['w-2 h-2 rounded-full shrink-0',
                    branchStore.activeBranchId === branch.id ? 'bg-sky-500' : 'bg-gray-200']"></span>
                  <div class="flex-1 min-w-0">
                    <p class="truncate">{{ branch.name }}</p>
                    <p v-if="branch.address" class="text-[10px] text-slate-400 truncate">{{ branch.address }}</p>
                  </div>
                  <span v-if="branchStore.activeBranchId === branch.id"
                    class="material-icons text-sky-500 text-sm">check</span>
                </button>

                <!-- Manage branches link (admin only) -->
                <div v-if="authStore.isAdmin" class="border-t border-gray-100 mt-1 pt-1">
                  <RouterLink to="/admin/branches" @click="branchDropdownOpen = false"
                    class="flex items-center gap-2 px-3 py-2 text-xs text-sky-500 hover:bg-sky-50 font-semibold transition-colors">
                    <span class="material-icons text-sm">settings</span>
                    Manage Branches
                  </RouterLink>
                </div>
              </div>
            </div>

            <!-- No branches yet: just show clinic name as static label -->
            <div v-else class="flex items-center gap-2 px-2 py-1.5">
              <div class="hidden md:flex w-7 h-7 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                <span class="material-icons text-slate-500" style="font-size:16px">store</span>
              </div>
              <span class="text-sm font-bold text-slate-800">{{ authStore.clinic?.name ?? 'Clinic' }}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Main</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <span class="material-icons" style="font-size:20px">notifications</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>

            <div class="relative">
              <button @click="menuOpen = !menuOpen" class="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <img v-if="avatarUrl" :src="avatarUrl" class="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-sky-100" />
                <div v-else class="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">{{ userInitial }}</div>
                <div class="hidden sm:block text-left min-w-0">
                  <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px]">{{ authStore.profile?.full_name ?? 'User' }}</p>
                  <p class="text-[11px] text-slate-400 capitalize leading-tight">{{ authStore.profile?.role }}</p>
                </div>
                <span class="material-icons text-slate-400" style="font-size:14px">expand_more</span>
              </button>

              <div v-if="menuOpen" class="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50">
                <div class="px-4 py-2.5 border-b border-gray-100">
                  <p class="text-xs font-bold text-slate-900 truncate">{{ authStore.profile?.full_name ?? 'User' }}</p>
                  <p class="text-xs text-slate-400 capitalize">{{ authStore.profile?.role }}</p>
                </div>
                <RouterLink to="/profile" @click="menuOpen = false" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <span class="material-icons text-slate-400" style="font-size:16px">person</span> My Profile
                </RouterLink>
                <template v-if="authStore.isAdmin">
                  <RouterLink to="/admin/users" @click="menuOpen = false" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <span class="material-icons text-slate-400" style="font-size:16px">group</span> Team
                  </RouterLink>
                  <RouterLink to="/admin/settings" @click="menuOpen = false" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <span class="material-icons text-slate-400" style="font-size:16px">settings</span> Clinic Settings
                  </RouterLink>
                </template>
                <div class="border-t border-gray-100 mt-1">
                  <button @click="handleLogout" class="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <span class="material-icons" style="font-size:16px">logout</span> Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="md:hidden fixed inset-0 z-50 flex">
        <div class="absolute inset-0 bg-black/30" @click="mobileMenuOpen = false"></div>
        <div class="relative w-64 bg-white shadow-xl flex flex-col">
          <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
            <AppLogo size="sm" :show-dot="true" :show-name="true" />
          </div>
          <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1">Operations</p>
            <RouterLink v-for="item in operationsNav" :key="item.to" :to="item.to" @click="mobileMenuOpen = false"
              :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive(item.to) ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50']">
              <span class="material-icons" style="font-size:18px">{{ item.icon }}</span> {{ item.label }}
            </RouterLink>
            <template v-if="authStore.isAdmin">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">Management</p>
              <RouterLink v-for="item in managementNav" :key="item.to" :to="item.to" @click="mobileMenuOpen = false"
                :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive(item.to) ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50']">
                <span class="material-icons" style="font-size:18px">{{ item.icon }}</span> {{ item.label }}
              </RouterLink>
            </template>
          </nav>

          <!-- Mobile branch indicator -->
          <div class="px-4 py-3 border-t border-gray-100">
            <div class="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <span class="material-icons text-slate-400" style="font-size:16px">store</span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-700 truncate">
                  {{ branchStore.isViewingAll
                      ? 'All Branches'
                      : (branchStore.activeBranch?.name ?? authStore.clinic?.name) }}
                </p>
                <p class="text-[10px] text-slate-400">
                  {{ branchStore.isViewingAll ? authStore.clinic?.name :
                     !branchStore.activeBranchId ? 'Main branch' : 'Branch' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main class="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
      <div class="flex items-center justify-around h-16 px-2">
        <RouterLink v-for="item in mobileNavItems" :key="item.to" :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors min-w-0"
          :class="isActive(item.to) ? 'text-sky-500' : 'text-slate-400 hover:text-slate-600'">
          <span class="material-icons" style="font-size:20px">{{ item.icon }}</span>
          <span class="text-xs font-medium truncate">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { useClinic } from '@/composables/useClinic'
import { supabase } from '@/services/supabase'
import AppLogo from '@/components/AppLogo.vue'

const authStore = useAuthStore()
const branchStore = useBranchStore()
const { planLabel, planColor } = useClinic()
const route = useRoute()

const menuOpen = ref(false)
const mobileMenuOpen = ref(false)
const branchDropdownOpen = ref(false)
const sidebarCollapsed = ref(false)
const avatarUrl = ref<string | null>(null)

function selectBranch(branchId: string | null) {
  branchStore.selectBranch(branchId as string)
  branchDropdownOpen.value = false
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-menu]')) {
    menuOpen.value = false
    branchDropdownOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleOutsideClick, true)
  await branchStore.loadBranches()
  if (authStore.user?.id) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(`${authStore.user.id}.jpg`)
    const img = new Image()
    img.onload = () => { avatarUrl.value = data.publicUrl + '?t=' + Date.now() }
    img.src = data.publicUrl
  }
})
onUnmounted(() => document.removeEventListener('click', handleOutsideClick, true))

const userInitial = computed(() =>
  (authStore.profile?.full_name ?? authStore.user?.email ?? 'U').charAt(0).toUpperCase()
)

const operationsNav = computed(() => [
  { to: '/dashboard',    label: 'Dashboard',       icon: 'dashboard' },
  { to: '/appointments', label: 'Appointments',    icon: 'calendar_month' },
  { to: authStore.isDoctor ? '/queue/doctor' : '/queue', label: 'Queue', icon: 'queue' },
  { to: '/patients',     label: 'Patients',        icon: 'group' },
  { to: '/records',      label: 'Medical Records', icon: 'description' },
  { to: '/revenue',      label: 'Payments',        icon: 'payments' },
  { to: '/reports',      label: 'Reports',         icon: 'bar_chart' },
])

const managementNav = computed(() => {
  const items = [
    { to: '/admin/users',    label: 'Users',             icon: 'manage_accounts' },
    { to: '/admin/branches', label: 'Branches',          icon: 'store' },
    { to: '/admin/settings', label: 'Clinic Settings',   icon: 'settings' },
    { to: '/admin/branding', label: 'Branding & Themes', icon: 'palette' },
  ]
  if (authStore.isSuperAdmin) {
    items.unshift({ to: '/admin/overview', label: 'Global Clinics', icon: 'public' })
  }
  return items
})

const systemNav = [
  { to: '/admin/billing', label: 'Subscription',   icon: 'credit_card' },
  { to: '/help',               label: 'Help & Support',  icon: 'help' },
]

const mobileNavItems = computed(() => {
  const items = [
    { to: '/dashboard',    label: 'Home',     icon: 'dashboard' },
    { to: '/patients',     label: 'Patients', icon: 'group' },
    { to: '/appointments', label: 'Schedule', icon: 'calendar_month' },
    { to: authStore.isDoctor ? '/queue/doctor' : '/queue', label: 'Queue', icon: 'queue' },
    { to: '/revenue',      label: 'Revenue',  icon: 'payments' },
  ]
  if (authStore.isSuperAdmin) {
    items.push({ to: '/admin/overview', label: 'Clinics', icon: 'public' })
  } else if (authStore.isAdmin) {
    items.push({ to: '/admin/settings', label: 'Settings', icon: 'settings' })
  }
  return items
})

function isActive(path: string) { return route.path.startsWith(path) }

async function handleLogout() {
  menuOpen.value = false
  branchStore.reset()
  await authStore.logout()
}
</script>