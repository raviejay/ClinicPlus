<template>
  <div class="min-h-screen bg-[#F0F4F8] flex">

    <!-- ─── SIDEBAR ───────────────────────────────────────────────────────── -->
    <aside
      :class="[
        'hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[68px]' : 'w-60'
      ]"
    >
      <!-- Logo + collapse toggle -->
      <div :class="[
        'flex items-center border-b border-gray-100 transition-all duration-300',
        sidebarCollapsed ? 'px-3 py-5 justify-center' : 'px-4 py-5 gap-3'
      ]">
        <AppLogo 
          size="sm" 
          :show-dot="true" 
          :show-name="!sidebarCollapsed"
          class="shrink-0" 
        />
        <button
          @click="sidebarCollapsed = !sidebarCollapsed"
          :class="[
            'rounded-lg p-1 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 shrink-0',
            sidebarCollapsed ? 'hidden' : ''
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      <!-- Expand button (collapsed state) -->
      <div v-if="sidebarCollapsed" class="flex justify-center pt-2">
        <button
          @click="sidebarCollapsed = false"
          class="rounded-lg p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5" :class="sidebarCollapsed ? 'px-2' : 'px-3'">
        <!-- Operations group -->
        <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1">Operations</p>
        <div v-else class="my-1 mx-2 h-px bg-gray-100"></div>

        <RouterLink
          v-for="item in operationsNav"
          :key="item.to"
          :to="item.to"
          :title="sidebarCollapsed ? item.label : ''"
          :class="[
            'flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative',
            sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
            isActive(item.to)
              ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          ]"
        >
          <svg class="shrink-0" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
          </svg>
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          <!-- Tooltip on collapsed -->
          <div v-if="sidebarCollapsed"
            class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
            {{ item.label }}
          </div>
        </RouterLink>

        <!-- Management group (admin only) -->
        <template v-if="authStore.isAdmin">
          <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">Management</p>
          <div v-else class="my-2 mx-2 h-px bg-gray-100"></div>

          <RouterLink
            v-for="item in managementNav"
            :key="item.to"
            :to="item.to"
            :title="sidebarCollapsed ? item.label : ''"
            :class="[
              'flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              isActive(item.to)
                ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            ]"
          >
            <svg class="shrink-0" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
            </svg>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            <div v-if="sidebarCollapsed"
              class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              {{ item.label }}
            </div>
          </RouterLink>
        </template>

        <!-- System group -->
        <template>
          <p v-if="!sidebarCollapsed" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">System</p>
          <div v-else class="my-2 mx-2 h-px bg-gray-100"></div>

          <RouterLink
            v-for="item in systemNav"
            :key="item.to"
            :to="item.to"
            :title="sidebarCollapsed ? item.label : ''"
            :class="[
              'flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              isActive(item.to)
                ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            ]"
          >
            <svg class="shrink-0" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
            </svg>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            <div v-if="sidebarCollapsed"
              class="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              {{ item.label }}
            </div>
          </RouterLink>
        </template>
      </nav>

      <!-- Plan badge (bottom of sidebar) -->
      <div class="px-3 py-4 border-t border-gray-100">
        <div v-if="!sidebarCollapsed" class="mx-1 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 border border-sky-200 px-3 py-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span :class="['text-xs font-bold', planColor]">{{ planLabel }}</span>
          </div>
          <p class="text-[11px] text-slate-500 leading-snug">Manage your plan in clinic settings.</p>
          <RouterLink to="/admin/settings"
            class="mt-2 block text-center text-[11px] font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-lg py-1.5 transition-colors">
            Upgrade Now ✦
          </RouterLink>
        </div>
        <div v-else class="flex justify-center">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" :title="planLabel"></span>
        </div>
      </div>
    </aside>

    <!-- ─── MAIN AREA ──────────────────────────────────────────────────── -->
    <div :class="['flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-60']">

      <!-- ── TOP NAVBAR ───────────────────────────────────────────────── -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div class="h-14 px-4 md:px-6 flex items-center justify-between gap-4">

          <!-- Left: mobile menu + clinic/branch info -->
          <div class="flex items-center gap-3">
            <!-- Mobile hamburger -->
            <button
              class="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <!-- Mobile logo (only on mobile) -->
            <div class="md:hidden flex items-center gap-2">
              <AppLogo size="sm" :show-dot="true" :show-name="true" />
            </div>

            <!-- Clinic name + branch selector -->
            <div class="flex items-center gap-2">
              <!-- Building icon -->
              <div class="hidden md:flex w-7 h-7 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <button
                @click="branchDropdownOpen = !branchDropdownOpen"
                class="flex items-center gap-2 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors"
              >
                <div class="text-left">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-bold text-slate-800">{{ authStore.clinic?.name ?? 'ABC Clinic' }}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600">Main Branch</span>
                  </div>
                </div>
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- Branch dropdown -->
              <div v-if="branchDropdownOpen"
                class="absolute top-14 left-4 md:left-auto mt-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">Select Branch</p>
                <button
                  v-for="branch in branches" :key="branch.id"
                  @click="selectBranch(branch)"
                  :class="[
                    'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left',
                    branch.isMain ? 'text-slate-800' : 'text-slate-600'
                  ]">
                  <span :class="['w-1.5 h-1.5 rounded-full shrink-0', branch.isActive ? 'bg-sky-500' : 'bg-gray-300']"></span>
                  <span class="flex-1 font-medium">{{ branch.name }}</span>
                  <span v-if="branch.isMain" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600">Main</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: What's New + Notifications + User -->
          <div class="flex items-center gap-2">
            <!-- What's New -->
            <button class="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors relative">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
              </svg>
              What's New
              <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-500"></span>
            </button>

            <!-- Notifications -->
            <button class="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>

            <!-- User menu -->
            <div class="relative">
              <button
                @click="menuOpen = !menuOpen"
                class="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <img v-if="avatarUrl" :src="avatarUrl" class="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-sky-100" />
                <div v-else class="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ring-2 ring-sky-100">
                  {{ userInitial }}
                </div>
                <div class="hidden sm:block text-left min-w-0">
                  <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px]">{{ authStore.profile?.full_name ?? 'User' }}</p>
                  <p class="text-[11px] text-slate-400 capitalize leading-tight">{{ authStore.profile?.role }}</p>
                </div>
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- User dropdown -->
              <div v-if="menuOpen"
                class="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50">
                <div class="px-4 py-2.5 border-b border-gray-100">
                  <p class="text-xs font-bold text-slate-900 truncate">{{ authStore.profile?.full_name ?? 'User' }}</p>
                  <p class="text-xs text-slate-400 capitalize">{{ authStore.profile?.role }}</p>
                </div>
                <RouterLink to="/profile" @click="menuOpen = false"
                  class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  My Profile
                </RouterLink>
                <template v-if="authStore.isAdmin">
                  <RouterLink to="/admin/users" @click="menuOpen = false"
                    class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Team
                  </RouterLink>
                  <RouterLink to="/admin/settings" @click="menuOpen = false"
                    class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Clinic Settings
                  </RouterLink>
                </template>
                <div class="border-t border-gray-100 mt-1">
                  <button @click="handleLogout"
                    class="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- ── Mobile slide-in menu ──────────────────────────────────────── -->
      <div v-if="mobileMenuOpen" class="md:hidden fixed inset-0 z-50 flex">
        <div class="absolute inset-0 bg-black/30" @click="mobileMenuOpen = false"></div>
        <div class="relative w-64 bg-white shadow-xl flex flex-col">
          <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
            <AppLogo size="sm" :show-dot="true" :show-name="true" />
          </div>
          <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1">Operations</p>
            <RouterLink v-for="item in operationsNav" :key="item.to" :to="item.to" @click="mobileMenuOpen = false"
              :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive(item.to) ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50']">
              <svg style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
              </svg>
              {{ item.label }}
            </RouterLink>
            <template v-if="authStore.isAdmin">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">Management</p>
              <RouterLink v-for="item in managementNav" :key="item.to" :to="item.to" @click="mobileMenuOpen = false"
                :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive(item.to) ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50']">
                <svg style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
                </svg>
                {{ item.label }}
              </RouterLink>
            </template>
          </nav>
        </div>
      </div>

      <!-- Page content -->
      <main class="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>

    <!-- ─── BOTTOM NAV (mobile only) ──────────────────────────────────── -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
      <div class="flex items-center justify-around h-16 px-2">
        <RouterLink v-for="item in mobileNavItems" :key="item.to" :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors min-w-0"
          :class="isActive(item.to) ? 'text-sky-500' : 'text-slate-400 hover:text-slate-600'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
          </svg>
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
import { useClinic } from '@/composables/useClinic'
import { supabase } from '@/services/supabase'
import AppLogo from '@/components/AppLogo.vue'

const authStore = useAuthStore()
const { planLabel, planColor } = useClinic()
const route = useRoute()

const menuOpen = ref(false)
const mobileMenuOpen = ref(false)
const branchDropdownOpen = ref(false)
const sidebarCollapsed = ref(false)
const avatarUrl = ref<string | null>(null)

// Example branches — replace with real data from authStore / branchService
const branches = ref([
  { id: '1', name: authStore.clinic?.name ?? 'ABC Clinic – Main Branch', isMain: true, isActive: true },
  { id: '2', name: 'North Branch',   isMain: false, isActive: false },
  { id: '3', name: 'South Branch',   isMain: false, isActive: false },
])

function selectBranch(branch: { id: string; name: string }) {
  // TODO: switch active branch via authStore / router
  branchDropdownOpen.value = false
}

// Close dropdowns when clicking outside
function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-dropdown]')) {
    menuOpen.value = false
    branchDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleOutsideClick, true))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick, true))

const userInitial = computed(() => {
  const name = authStore.profile?.full_name ?? authStore.user?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})

const ICONS = {
  home:      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  calendar:  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  queue:     'M4 6h16M4 10h16M4 14h16M4 18h16',
  patients:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  records:   'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  revenue:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  reports:   'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  users:     'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  settings:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  branches:  'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  subscription: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  activity:  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  help:      'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  branding:  'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
}

const operationsNav = computed(() => {
  const isDoctor = authStore.isDoctor
  return [
    { to: '/dashboard',    label: 'Dashboard',      icon: ICONS.home },
    { to: '/appointments', label: 'Appointments',   icon: ICONS.calendar },
    { to: isDoctor ? '/queue/doctor' : '/queue', label: 'Queue', icon: ICONS.queue },
    { to: '/patients',     label: 'Patients',       icon: ICONS.patients },
    { to: '/records',      label: 'Medical Records', icon: ICONS.records },
    { to: '/revenue',      label: 'Payments',       icon: ICONS.revenue },
    { to: '/reports',      label: 'Reports',        icon: ICONS.reports },
  ]
})

const managementNav = [
  { to: '/admin/users',    label: 'Users',           icon: ICONS.users },
  { to: '/admin/branches', label: 'Branches',        icon: ICONS.branches },
  { to: '/admin/settings', label: 'Clinic Settings', icon: ICONS.settings },
  { to: '/admin/branding', label: 'Branding & Themes', icon: ICONS.branding },
]

const systemNav = [
  { to: '/admin/subscription', label: 'Subscription',  icon: ICONS.subscription },
  { to: '/admin/activity',     label: 'Activity Logs', icon: ICONS.activity },
  { to: '/admin/system',       label: 'Settings',      icon: ICONS.settings },
  { to: '/help',               label: 'Help & Support', icon: ICONS.help },
]

const mobileNavItems = computed(() => {
  const isDoctor = authStore.isDoctor
  const items = [
    { to: '/dashboard',    label: 'Home',     icon: ICONS.home },
    { to: '/patients',     label: 'Patients', icon: ICONS.patients },
    { to: '/appointments', label: 'Schedule', icon: ICONS.calendar },
    { to: isDoctor ? '/queue/doctor' : '/queue', label: 'Queue', icon: ICONS.queue },
    { to: '/revenue',      label: 'Revenue',  icon: ICONS.revenue },
  ]
  if (authStore.isAdmin) {
    items.push({ to: '/admin/settings', label: 'Settings', icon: ICONS.settings })
  }
  return items
})

function isActive(path: string) {
  return route.path.startsWith(path)
}

async function handleLogout() {
  menuOpen.value = false
  await authStore.logout()
}

onMounted(async () => {
  if (!authStore.user?.id) return
  const { data } = supabase.storage.from('avatars').getPublicUrl(`avatars/${authStore.user.id}.jpg`)
  const img = new Image()
  img.onload = () => { avatarUrl.value = data.publicUrl + '?t=' + Date.now() }
  img.onerror = () => {}
  img.src = data.publicUrl
})
</script>