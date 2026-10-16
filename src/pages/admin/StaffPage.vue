<template>
  <AppLayout>
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black tracking-tight text-slate-900">Team</h1>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ staff.length }} member{{ staff.length !== 1 ? 's' : '' }}<template v-if="inactiveCount"> · {{ inactiveCount }} deactivated</template>
          </p>
        </div>
        <button @click="openAdd"
          :disabled="!!(staffLimit && !staffLimit.allowed)"
          class="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-sky-200">
          <span class="material-icons text-sm">add</span>
          Add
        </button>
      </div>

      <PlanLimitAlert v-if="staffLimit" :limit-check="staffLimit" title="Staff" />

      <!-- Find someone -->
      <div v-if="staff.length > 3" class="flex flex-col sm:flex-row gap-2">
        <div class="relative flex-1">
          <span class="material-icons text-slate-300 text-[18px] absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input v-model="search" type="search" placeholder="Search by name or email" aria-label="Search team"
            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
        </div>
        <div class="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by role">
          <button v-for="f in filters" :key="f.value" type="button" role="tab" :aria-selected="roleFilter === f.value"
            @click="roleFilter = f.value"
            :class="['shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
              roleFilter === f.value ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-sky-300']">
            {{ f.label }}<span v-if="f.count !== null" class="ml-1 opacity-70">{{ f.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="staff.length === 0" class="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <span class="material-icons text-5xl text-slate-200">group</span>
        <p class="text-sm font-semibold text-slate-700 mt-3">No team members yet</p>
        <p class="text-xs text-slate-400 mt-1">Add doctors and staff to get started</p>
      </div>

      <div v-else-if="visible.length === 0" class="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p class="text-sm font-semibold text-slate-700">No one matches that</p>
        <button type="button" class="text-xs text-sky-600 font-semibold mt-1" @click="search = ''; roleFilter = 'all'">Clear filters</button>
      </div>

      <div v-else class="space-y-2">
        <div v-for="member in visible" :key="member.id"
          :class="['bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3', member.is_active === false && 'opacity-70']">

          <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
            member.role === 'doctor' ? 'bg-sky-100 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600']">
            {{ (member.full_name ?? 'U').charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 truncate">
              {{ member.full_name ?? 'Unnamed' }}
              <span v-if="member.id === authStore.user?.id" class="text-xs text-slate-300 font-normal ml-1">(you)</span>
            </p>
            <p v-if="emails[member.id]" class="text-xs text-slate-500 truncate">{{ emails[member.id] }}</p>
            <div class="flex items-center gap-x-2 flex-wrap mt-0.5 text-xs">
              <span v-if="getBranchName(member.branch_id)" class="text-sky-500 font-medium">{{ getBranchName(member.branch_id) }}</span>
              <span v-else-if="branches.length > 0" class="text-slate-300">All branches</span>
              <template v-if="member.id in lastSignIn">
                <span class="text-slate-200">·</span>
                <span class="text-slate-400">{{ lastSignInLabel(lastSignIn[member.id]) }}</span>
              </template>
            </div>
          </div>

          <span v-if="member.is_active === false" class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-amber-50 text-amber-700">
            Deactivated
          </span>
          <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 capitalize',
            member.role === 'doctor' ? 'bg-sky-50 text-sky-600' :
            member.role === 'admin'  ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500']">
            {{ member.role }}
          </span>

          <button v-if="canManage(member)" type="button" @click="managing = member"
            :aria-label="`Manage ${member.full_name ?? 'member'}`"
            class="shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors">
            <span class="material-icons text-[15px]">tune</span>
            <span class="hidden sm:inline">Manage</span>
          </button>
        </div>
      </div>

    </div>

    <StaffMemberModal v-if="managing" :key="managing.id" :member="managing" :email="emails[managing.id] ?? null"
      :branches="branches" :clinic-name="authStore.clinic?.name ?? 'your clinic'"
      @close="managing = null" @changed="refresh" />

    <!-- Add modal -->
    <Teleport to="body">
      <div v-if="showAdd"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[92vh] overflow-y-auto">

          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-black text-slate-900">Add Team Member</h2>
            <button @click="closeAdd" aria-label="Close" class="text-slate-400 hover:text-slate-600">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <template v-if="created">
              <CredentialsCard title="Account created! Share these credentials:" :email="created.email" :password="created.password"
                :clinic-name="authStore.clinic?.name ?? 'your clinic'" />
              <button @click="closeAdd" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                Done
              </button>
            </template>

            <template v-else>
              <div>
                <label for="add-name" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name <span class="text-red-400">*</span></label>
                <input id="add-name" v-model="form.full_name" type="text" placeholder="Dr. Juan Dela Cruz" :class="inputClass" />
              </div>
              <div>
                <label for="add-email" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email <span class="text-red-400">*</span></label>
                <input id="add-email" v-model="form.email" type="email" placeholder="doctor@clinic.com" :class="inputClass" />
              </div>
              <div>
                <span class="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Role</span>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="form.role = 'doctor'" :class="['py-3 rounded-xl text-sm font-semibold border transition-colors', form.role === 'doctor' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">🩺 Doctor</button>
                  <button @click="form.role = 'staff'" :class="['py-3 rounded-xl text-sm font-semibold border transition-colors', form.role === 'staff' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">🧑‍💼 Staff</button>
                </div>
              </div>

              <div v-if="branches.length > 0">
                <label for="add-branch" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Assign to Branch <span class="text-slate-300 normal-case font-normal">(optional)</span>
                </label>
                <select id="add-branch" v-model="form.branch_id" :class="inputClass">
                  <option value="">All branches (no restriction)</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
                </select>
                <p class="text-xs text-slate-400 mt-1">They will only see data from their assigned branch.</p>
              </div>

              <div class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p class="text-xs text-amber-700">A temporary password will be generated. Share it with them after creation.</p>
              </div>

              <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
                <p class="text-xs text-red-600">{{ errorMsg }}</p>
              </div>

              <button @click="handleAdd" :disabled="saving || !form.full_name.trim() || !form.email.trim()"
                class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-sky-200">
                {{ saving ? 'Saving…' : 'Add Team Member' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinic } from '@/composables/useClinic'
import { staffService, type Credentials } from '@/services/staff.service'
import { branchService } from '@/services/branch.service'
import { planRestrictionService } from '@/services/planRestriction.service'
import { filterMembers, lastSignInLabel, type RoleFilter } from '@/utils/staff'
import AppLayout from '@/layouts/AppLayout.vue'
import PlanLimitAlert from '@/components/ui/PlanLimitAlert.vue'
import CredentialsCard from './staff/CredentialsCard.vue'
import StaffMemberModal from './staff/StaffMemberModal.vue'
import type { Profile, Branch, ClinicPlan } from '@/types'

const authStore = useAuthStore()
const { plan, isTrialActive } = useClinic()

const effectivePlan = computed((): ClinicPlan =>
  isTrialActive.value ? 'premium' : (plan.value as ClinicPlan)
)

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all'

const staff = ref<Profile[]>([])
const branches = ref<Branch[]>([])
const emails = ref<Record<string, string | null>>({})
const lastSignIn = ref<Record<string, string | null>>({})
const loading = ref(true)
const staffLimit = ref<Awaited<ReturnType<typeof planRestrictionService.checkStaffLimit>>['data']>(null)

const search = ref('')
const roleFilter = ref<RoleFilter>('all')
const managing = ref<Profile | null>(null)

const inactiveCount = computed(() => staff.value.filter(m => m.is_active === false).length)
const visible = computed(() => filterMembers(staff.value, emails.value, search.value, roleFilter.value))
const filters = computed(() => [
  { value: 'all' as const, label: 'All', count: staff.value.length },
  { value: 'doctor' as const, label: 'Doctors', count: staff.value.filter(m => m.role === 'doctor').length },
  { value: 'staff' as const, label: 'Staff', count: staff.value.filter(m => m.role === 'staff').length },
  ...(inactiveCount.value ? [{ value: 'inactive' as const, label: 'Deactivated', count: inactiveCount.value }] : []),
])

// Admins (including you) are managed elsewhere; everyone else can be managed here
const canManage = (m: Profile) => m.id !== authStore.user?.id && (m.role === 'doctor' || m.role === 'staff')

function getBranchName(branchId: string | null) {
  if (!branchId) return null
  return branches.value.find(b => b.id === branchId)?.name ?? null
}

async function loadStaffLimit() {
  if (!authStore.clinic?.id) return
  const result = await planRestrictionService.checkStaffLimit(authStore.clinic.id, effectivePlan.value)
  staffLimit.value = result.data
}

async function loadStaff() {
  if (!authStore.clinic?.id) return
  const { data } = await staffService.getAll(authStore.clinic.id)
  staff.value = data ?? []
}

// Emails and last sign-in come from the auth system; the list works without them
async function loadDetails() {
  const { data } = await staffService.getDetails()
  if (!data) return
  emails.value = Object.fromEntries(data.map(d => [d.id, d.email]))
  lastSignIn.value = Object.fromEntries(data.map(d => [d.id, d.last_sign_in_at]))
}

async function loadBranches() {
  if (!authStore.clinic?.id) return
  const { data } = await branchService.getAll(authStore.clinic.id)
  branches.value = data ?? []
}

async function refresh() {
  await Promise.all([loadStaff(), loadDetails(), loadStaffLimit()])
}

// ── Add ──
const showAdd = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const created = ref<Credentials | null>(null)
const form = ref({ full_name: '', email: '', role: 'doctor' as 'doctor' | 'staff', branch_id: '' })

function openAdd() {
  if (staffLimit.value && !staffLimit.value.allowed) return
  form.value = { full_name: '', email: '', role: 'doctor', branch_id: '' }
  errorMsg.value = ''
  created.value = null
  showAdd.value = true
}

function closeAdd() {
  showAdd.value = false
  created.value = null
  errorMsg.value = ''
}

async function handleAdd() {
  if (!authStore.clinic?.id) return
  saving.value = true
  errorMsg.value = ''

  await loadStaffLimit()
  if (staffLimit.value && !staffLimit.value.allowed) {
    errorMsg.value = staffLimit.value.max <= 1
      ? 'Starter plan includes only your admin account. Upgrade to Pro to add doctors and staff.'
      : `Dashboard user limit reached (${staffLimit.value.current}/${staffLimit.value.max}). Upgrade your plan to add more team members.`
    saving.value = false
    return
  }

  // The branch goes with the request, so the account is created already assigned
  const { data, error } = await staffService.invite({
    email: form.value.email.trim(),
    full_name: form.value.full_name.trim(),
    role: form.value.role,
    branch_id: form.value.branch_id || null,
  })
  saving.value = false
  if (error) { errorMsg.value = error; return }

  created.value = data
  await refresh()
}

onMounted(async () => {
  await Promise.all([loadBranches(), refresh()])
  loading.value = false
})
</script>
