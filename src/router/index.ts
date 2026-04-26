import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: () => import('@/pages/LandingPage.vue') },
    { path: '/login', name: 'login', component: () => import('@/pages/auth/LoginPage.vue'), meta: { requiresGuest: true } },
    { path: '/register', name: 'register', component: () => import('@/pages/auth/RegisterPage.vue'), meta: { requiresGuest: true } },
    { path: '/clinic-setup', name: 'clinic-setup', component: () => import('@/pages/clinic/ClinicSetupPage.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/pages/dashboard/DashboardPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Patients
    { path: '/patients', name: 'patients', component: () => import('@/pages/patients/PatientsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/patients/new', name: 'patients-new', component: () => import('@/pages/patients/NewPatientPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Appointments
    { path: '/appointments', name: 'appointments', component: () => import('@/pages/appointments/AppointmentsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/appointments/new', name: 'appointments-new', component: () => import('@/pages/appointments/NewAppointmentPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Admin
    { path: '/admin/settings', name: 'admin-settings', component: () => import('@/pages/admin/SettingsPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    // Placeholders for future phases
    // Queue
    { path: '/queue', name: 'queue', component: () => import('@/pages/queue/QueuePage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/queue/doctor', name: 'doctor-queue', component: () => import('@/pages/queue/DoctorQueuePage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/revenue',       redirect: '/dashboard' },
    { path: '/admin/billing', redirect: '/dashboard' },
    // Public booking — no auth
    { path: '/book/:slug', name: 'booking', component: () => import('@/pages/booking/BookingPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.initialized) await authStore.initialize()
  if (to.meta.requiresAuth && !authStore.user) return { name: 'login' }
  if (to.meta.requiresGuest && authStore.user) {
    if (!authStore.profile?.clinic_id) return { name: 'clinic-setup' }
    return { name: 'dashboard' }
  }
  if (to.meta.requiresClinic && authStore.user && !authStore.profile?.clinic_id) return { name: 'clinic-setup' }
  if (to.meta.requiresAdmin && !authStore.isAdmin) return { name: 'dashboard' }
})

export default router