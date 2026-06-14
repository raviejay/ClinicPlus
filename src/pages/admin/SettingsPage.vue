<template>
  <AppLayout>
    <div class="space-y-5">

      <div class="flex items-center gap-3">
        <RouterLink to="/dashboard" class="text-slate-400 hover:text-slate-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </RouterLink>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Clinic Settings</h1>
      </div>

      <!-- Clinic info -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-bold text-slate-900 mb-4">Clinic Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Clinic Name</label>
            <input v-model="form.name" type="text"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
            <input v-model="form.email" type="email"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Booking URL slug</label>
            <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-slate-50">
              <span class="px-3 py-3 text-xs text-slate-400 border-r border-gray-200 whitespace-nowrap">clinicgo.app/book/</span>
              <input v-model="form.slug" type="text"
                class="flex-1 px-3 py-3 text-sm text-sky-600 font-mono bg-transparent focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <!-- Booking settings -->
      <div class="bg-white border border-gray-200 rounded-xl p-5">
        <h2 class="text-sm font-bold text-slate-900 mb-4">Booking Configuration</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Booking Mode</label>
            <select v-model="settingsForm.booking_mode"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-all">
              <option value="auto_assign">Auto-assign (system picks doctor)</option>
              <option value="doctor_selection">Doctor selection (patient picks)</option>
              <option value="hybrid" :disabled="!canUseFeature('multi_branch')">Hybrid (Premium only)</option>
            </select>
          </div>

          <!-- Toggle settings -->
          <div class="space-y-3 pt-1">
            <div v-for="toggle in toggleSettings" :key="toggle.key"
              class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p class="text-sm font-medium text-slate-700">{{ toggle.label }}</p>
                <p class="text-xs text-slate-400">{{ toggle.desc }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="toggle.planRequired && !canUseFeature(toggle.key)"
                  class="text-xs text-slate-300 font-semibold">{{ toggle.planRequired }}</span>
                <button
                  @click="toggleSetting(toggle.key)"
                  :disabled="!!toggle.planRequired && !canUseFeature(toggle.key)"
                  :class="[
                    'relative w-10 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
                    settingsForm[toggle.key as keyof typeof settingsForm] ? 'bg-sky-500' : 'bg-gray-200'
                  ]">
                  <span :class="[
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    settingsForm[toggle.key as keyof typeof settingsForm] ? 'translate-x-4' : 'translate-x-0'
                  ]"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save -->
      <div v-if="successMsg" class="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-green-700 font-medium">{{ successMsg }}</p>
      </div>

      <div v-if="errorMsg" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-red-600">{{ errorMsg }}</p>
      </div>

      <button @click="saveSettings" :disabled="saving"
        class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
        {{ saving ? 'Saving…' : 'Save Settings' }}
      </button>

      <!-- ════════════════════════════════════════════════════
           SERVICE MANAGEMENT
           Clinics define their own service catalog here.
           These appear in the booking page and new appointment form.
      ════════════════════════════════════════════════════ -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Service Catalog</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Define the services your clinic offers. These will appear in the booking page and when staff create appointments.
            </p>
          </div>
          <button @click="showAddServiceModal = true"
            class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
            <span class="material-icons text-[14px]">add</span>
            Add Service
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loadingServices" class="flex justify-center py-10">
          <div class="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="allServices.length === 0" class="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <span class="material-icons text-slate-400 text-2xl">medical_services</span>
          </div>
          <p class="text-sm font-semibold text-slate-700 mb-1">No services yet</p>
          <p class="text-xs text-slate-400 mb-4 max-w-xs">
            Add your clinic's services so patients and staff can select them when booking appointments.
          </p>
          <button @click="showAddServiceModal = true"
            class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <span class="material-icons text-[14px]">add</span>
            Add Your First Service
          </button>
        </div>

        <!-- Service list grouped by category -->
        <div v-else class="divide-y divide-gray-100">
          <div v-for="(group, catId) in groupedServices" :key="catId" class="p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">{{ group.icon }}</span>
              <span class="text-sm font-bold text-slate-800">{{ group.name }}</span>
              <span class="ml-auto text-xs text-slate-400">{{ group.items.length }} service{{ group.items.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="space-y-2">
              <div v-for="svc in group.items" :key="svc.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-slate-50 hover:bg-white hover:border-gray-200 transition-all group">
                <span :class="['material-icons text-[16px]', svc.is_active ? 'text-green-400' : 'text-slate-300']">
                  {{ svc.is_active ? 'check_circle' : 'radio_button_unchecked' }}
                </span>
                <span class="flex-1 text-sm text-slate-700">{{ svc.service_name }}</span>
                <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <!-- Toggle active -->
                  <button
                    @click="toggleServiceActive(svc)"
                    :title="svc.is_active ? 'Deactivate' : 'Activate'"
                    :class="['w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                      svc.is_active ? 'text-amber-400 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50']">
                    <span class="material-icons text-[15px]">{{ svc.is_active ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                  <!-- Delete -->
                  <button
                    @click="deleteService(svc.id)"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    <span class="material-icons text-[15px]">delete_outline</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════
           ADD SERVICE MODAL
      ════════════════════════════════════════════════════ -->
      <div v-if="showAddServiceModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showAddServiceModal = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 class="text-sm font-bold text-slate-800">Add New Service</h3>
            <button @click="showAddServiceModal = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <span class="material-icons text-[20px]">close</span>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <!-- Category -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Category <span class="text-red-400">*</span>
              </label>
              <!-- Existing category or new -->
              <div class="flex gap-2 mb-2">
                <button
                  @click="newServiceMode = 'existing'"
                  :class="['flex-1 py-2 text-xs font-bold rounded-xl border transition-all',
                    newServiceMode === 'existing' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300']">
                  Existing Category
                </button>
                <button
                  @click="newServiceMode = 'new'"
                  :class="['flex-1 py-2 text-xs font-bold rounded-xl border transition-all',
                    newServiceMode === 'new' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300']">
                  New Category
                </button>
              </div>

              <!-- Pick from existing categories -->
              <div v-if="newServiceMode === 'existing'" class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                <button
                  v-for="cat in existingCategories"
                  :key="cat.id"
                  @click="selectCategory(cat)"
                  :class="['flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-xs',
                    newService.category_id === cat.id
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">
                  <span>{{ cat.icon }}</span>
                  <span class="font-semibold">{{ cat.name }}</span>
                </button>
                <p v-if="existingCategories.length === 0" class="col-span-2 text-xs text-slate-400 py-2">
                  No categories yet. Switch to "New Category" to create one.
                </p>
              </div>

              <!-- Create new category -->
              <div v-else class="space-y-3">
                <div class="flex gap-2">
                  <div class="w-16">
                    <label class="block text-[10px] font-semibold text-slate-500 mb-1">Icon</label>
                    <input v-model="newService.category_icon" type="text" maxlength="4" placeholder="🏥"
                      class="w-full text-center py-2.5 border border-gray-200 rounded-xl text-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400" />
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] font-semibold text-slate-500 mb-1">Category Name <span class="text-red-400">*</span></label>
                    <input v-model="newService.category_name" type="text" placeholder="e.g. Dental, Pediatric"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Service name -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Service Name <span class="text-red-400">*</span>
              </label>
              <input v-model="newService.service_name" type="text" placeholder="e.g. Tooth Extraction, Braces Consultation"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all" />
            </div>

            <!-- Error -->
            <p v-if="serviceErrorMsg" class="text-xs text-red-500">{{ serviceErrorMsg }}</p>

            <button @click="addService" :disabled="addingService || !canAddService"
              class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm">
              {{ addingService ? 'Adding…' : 'Add Service' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import { supabase } from '@/services/supabase'
import { clinicServicesService } from '@/services/clinic-services.service'
import AppLayout from '@/layouts/AppLayout.vue'
import type { ClinicService } from '@/types'

const authStore = useAuthStore()
const { canUseFeature } = useClinic()

// ── Settings form ──
const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const form = ref({
  name: authStore.clinic?.name ?? '',
  email: authStore.clinic?.email ?? '',
  slug: authStore.clinic?.slug ?? '',
})

const settingsForm = ref({
  booking_mode: authStore.clinicSettings?.booking_mode ?? 'auto_assign',
  queue_enabled: authStore.clinicSettings?.queue_enabled ?? false,
  multi_branch_enabled: authStore.clinicSettings?.multi_branch_enabled ?? false,
})

const toggleSettings = [
  { key: 'queue_enabled',        label: 'Queue system',  desc: 'Enable walk-in queue management',  planRequired: 'Pro+' },
  { key: 'multi_branch_enabled', label: 'Multi-branch',  desc: 'Operate multiple clinic branches', planRequired: 'Premium' },
]

function toggleSetting(key: string) {
  const k = key as keyof typeof settingsForm.value
  if (typeof settingsForm.value[k] === 'boolean') {
    (settingsForm.value[k] as boolean) = !(settingsForm.value[k] as boolean)
  }
}

async function saveSettings() {
  if (!authStore.clinic?.id) return
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  const clinicId = authStore.clinic.id

  const [clinicRes, settingsRes] = await Promise.all([
    supabase.from('clinics')
      .update({ name: form.value.name, email: form.value.email, slug: form.value.slug })
      .eq('id', clinicId),
    supabase.from('clinic_settings')
      .update(settingsForm.value)
      .eq('clinic_id', clinicId),
  ])

  saving.value = false

  if (clinicRes.error || settingsRes.error) {
    errorMsg.value = clinicRes.error?.message ?? settingsRes.error?.message ?? 'Failed to save.'
    return
  }

  await authStore.loadClinic(clinicId)
  successMsg.value = 'Settings saved successfully.'
  setTimeout(() => successMsg.value = '', 3000)
}

// ── Service management ──
const loadingServices = ref(false)
const allServices = ref<ClinicService[]>([])
const showAddServiceModal = ref(false)
const newServiceMode = ref<'existing' | 'new'>('existing')
const addingService = ref(false)
const serviceErrorMsg = ref('')

const newService = ref({
  category_id: '',
  category_name: '',
  category_icon: '🏥',
  service_name: '',
})

/** Unique categories extracted from existing services */
const existingCategories = computed(() => {
  const map = new Map<string, { id: string; name: string; icon: string }>()
  for (const svc of allServices.value) {
    if (!map.has(svc.category_id)) {
      map.set(svc.category_id, { id: svc.category_id, name: svc.category_name, icon: svc.category_icon })
    }
  }
  return Array.from(map.values())
})

/** Services grouped by category for display */
const groupedServices = computed(() => {
  const map: Record<string, { name: string; icon: string; items: ClinicService[] }> = {}
  for (const svc of allServices.value) {
    if (!map[svc.category_id]) {
      map[svc.category_id] = { name: svc.category_name, icon: svc.category_icon, items: [] }
    }
    map[svc.category_id].items.push(svc)
  }
  return map
})

const canAddService = computed(() => {
  const hasCategory = newServiceMode.value === 'existing'
    ? !!newService.value.category_id
    : !!newService.value.category_name.trim()
  return hasCategory && !!newService.value.service_name.trim()
})

function selectCategory(cat: { id: string; name: string; icon: string }) {
  newService.value.category_id = cat.id
  newService.value.category_name = cat.name
  newService.value.category_icon = cat.icon
}

async function loadServices() {
  if (!authStore.clinic?.id) return
  loadingServices.value = true
  const { data } = await clinicServicesService.getAll(authStore.clinic.id)
  loadingServices.value = false
  allServices.value = data ?? []
}

async function addService() {
  if (!authStore.clinic?.id || !canAddService.value) return
  addingService.value = true
  serviceErrorMsg.value = ''

  const categoryId = newServiceMode.value === 'existing'
    ? newService.value.category_id
    : newService.value.category_name.trim().toLowerCase().replace(/\s+/g, '_')

  const { error } = await clinicServicesService.addService({
    clinic_id: authStore.clinic.id,
    category_id: categoryId,
    category_name: newService.value.category_name.trim() || (existingCategories.value.find(c => c.id === categoryId)?.name ?? ''),
    category_icon: newService.value.category_icon || '🏥',
    service_name: newService.value.service_name.trim(),
  })

  addingService.value = false

  if (error) { serviceErrorMsg.value = error; return }

  // Reset form & reload
  newService.value = { category_id: '', category_name: '', category_icon: '🏥', service_name: '' }
  newServiceMode.value = 'existing'
  showAddServiceModal.value = false
  await loadServices()
}

async function toggleServiceActive(svc: ClinicService) {
  await clinicServicesService.updateService(svc.id, { is_active: !svc.is_active })
  await loadServices()
}

async function deleteService(id: string) {
  if (!confirm('Remove this service?')) return
  await clinicServicesService.deleteService(id)
  await loadServices()
}

onMounted(() => loadServices())
</script>