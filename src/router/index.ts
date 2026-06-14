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
    // Profile — all roles
    { path: '/profile', name: 'profile', component: () => import('@/pages/profile/ProfilePage.vue'), meta: { requiresAuth: true } },
    // Patients
    { path: '/patients', name: 'patients', component: () => import('@/pages/patients/PatientsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/patients/new', name: 'patients-new', component: () => import('@/pages/patients/NewPatientPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/patients/:id', name: 'patient-detail', component: () => import('@/pages/patients/PatientDetailPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Medical records
   // Medical records
{ path: '/medical-records/new', name: 'medical-records-new', component: () => import('@/pages/medical-records/NewRecordPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
{ path: '/records', name: 'records', component: () => import('@/pages/medical-records/RecordsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Appointments
    { path: '/appointments', name: 'appointments', component: () => import('@/pages/appointments/AppointmentsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/appointments/new', name: 'appointments-new', component: () => import('@/pages/appointments/NewAppointmentPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Queue
    { path: '/queue', name: 'queue', component: () => import('@/pages/queue/QueuePage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/queue/tv', name: 'queue-tv', component: () => import('@/pages/queue/QueueTVDisplay.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/queue/doctor', name: 'doctor-queue', component: () => import('@/pages/queue/DoctorQueuePage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    //reports
    { path: '/reports', name: 'reports', component: () => import('@/pages/reports/ReportsPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    // Admin only
    { path: '/admin/overview', name: 'admin-overview', component: () => import('@/pages/admin/SuperAdminDashboard.vue'), meta: { requiresAuth: true, requiresSuperAdmin: true } },
    { path: '/admin/super-admin', name: 'super-admin', component: () => import('@/pages/admin/SuperAdminPage.vue'), meta: { requiresAuth: true, requiresSuperAdmin: true } },
    { path: '/admin/settings', name: 'admin-settings', component: () => import('@/pages/admin/SettingsPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    { path: '/admin/branding', name: 'admin-branding', component: () => import('@/pages/admin/BrandingPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    { path: '/admin/users', name: 'admin-users', component: () => import('@/pages/admin/StaffPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    { path: '/admin/branches', name: 'admin-branches', component: () => import('@/pages/admin/BranchesPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    { path: '/admin/billing', name: 'admin-billing', component: () => import('@/pages/admin/BillingPage.vue'), meta: { requiresAuth: true, requiresClinic: true, requiresAdmin: true } },
    // Placeholders
    // Revenue
    { path: '/revenue', name: 'revenue', component: () => import('@/pages/revenue/RevenuePage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
    { path: '/revenue/record', name: 'revenue-record', component: () => import('@/pages/revenue/RecordPaymentPage.vue'), meta: { requiresAuth: true, requiresClinic: true } },
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
    if (authStore.isSuperAdmin) return { name: 'admin-overview' }
    if (!authStore.profile?.clinic_id) return { name: 'clinic-setup' }
    return { name: 'dashboard' }
  }
  if (to.meta.requiresClinic && authStore.user && !authStore.profile?.clinic_id && !authStore.isSuperAdmin) return { name: 'clinic-setup' }
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) return { name: 'dashboard' }
  if (to.meta.requiresAdmin && !authStore.isAdmin) return { name: 'dashboard' }
})

export default router