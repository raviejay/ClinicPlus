import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/clinic-setup',
      name: 'clinic-setup',
      component: () => import('@/pages/clinic/ClinicSetupPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true, requiresClinic: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.user) return { name: 'login' }
  if (to.meta.requiresGuest && authStore.user) {
    if (!authStore.profile?.clinic_id) return { name: 'clinic-setup' }
    return { name: 'dashboard' }
  }
  if (to.meta.requiresClinic && authStore.user && !authStore.profile?.clinic_id) {
    return { name: 'clinic-setup' }
  }
})

export default router
