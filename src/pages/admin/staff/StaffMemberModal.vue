<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="$emit('close')">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true"
        :aria-label="`Manage ${member.full_name ?? 'member'}`">

        <div class="p-5 border-b border-gray-100 flex items-center gap-3">
          <div :class="['w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0',
            member.role === 'doctor' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-600']">
            {{ (member.full_name ?? 'U').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-black text-slate-900 truncate">{{ member.full_name ?? 'Unnamed' }}</h2>
            <p class="text-xs text-slate-400 truncate">{{ email ?? 'Email unavailable' }}</p>
          </div>
          <button type="button" @click="$emit('close')" aria-label="Close" class="text-slate-400 hover:text-slate-600">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="p-5 space-y-6">
          <!-- New credentials, after a reset -->
          <CredentialsCard v-if="credentials" title="Password reset. Share the new login:"
            :email="credentials.email" :password="credentials.password" :clinic-name="clinicName" />

          <template v-else>
            <div v-if="member.is_active === false" class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span class="material-icons text-amber-500 text-sm mt-0.5">block</span>
              <p class="text-xs text-amber-800">This account is deactivated. They cannot sign in or see any clinic data.</p>
            </div>

            <!-- Details -->
            <section aria-labelledby="sm-details">
              <h3 id="sm-details" class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Details</h3>
              <div class="space-y-3">
                <div>
                  <label for="sm-name" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Full name</label>
                  <input id="sm-name" v-model="form.full_name" type="text" maxlength="120" :class="inputClass" />
                </div>
                <div>
                  <span class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Role</span>
                  <div class="grid grid-cols-2 gap-2">
                    <button v-for="r in ROLES" :key="r.value" type="button" @click="form.role = r.value" :aria-pressed="form.role === r.value"
                      :class="['py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                        form.role === r.value ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-slate-600 hover:border-sky-300']">
                      {{ r.label }}
                    </button>
                  </div>
                </div>
                <div v-if="branches.length > 0">
                  <label for="sm-branch" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Branch</label>
                  <select id="sm-branch" v-model="form.branch_id" :class="inputClass">
                    <option value="">All branches (no restriction)</option>
                    <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                </div>
                <button type="button" @click="save" :disabled="busy !== '' || !changed || form.full_name.trim().length < 2"
                  class="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {{ busy === 'save' ? 'Saving…' : 'Save changes' }}
                </button>
              </div>
            </section>

            <!-- Account -->
            <section aria-labelledby="sm-account">
              <h3 id="sm-account" class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h3>
              <div class="space-y-2">
                <ConfirmRow icon="key" label="Reset password" hint="Creates a new temporary password. The old one stops working."
                  confirm-text="Reset it" :busy="busy === 'reset'" :disabled="busy !== ''" @confirm="resetPassword" />
                <ConfirmRow v-if="member.is_active !== false" icon="block" label="Deactivate account"
                  hint="Locks them out right away. Their records and history stay."
                  confirm-text="Deactivate" tone="warn" :busy="busy === 'active'" :disabled="busy !== ''" @confirm="setActive(false)" />
                <ConfirmRow v-else icon="check_circle" label="Reactivate account" hint="They can sign in again with their current password."
                  confirm-text="Reactivate" :busy="busy === 'active'" :disabled="busy !== ''" @confirm="setActive(true)" />
              </div>
            </section>

            <section aria-labelledby="sm-danger">
              <h3 id="sm-danger" class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Remove</h3>
              <ConfirmRow icon="person_remove" label="Remove from clinic"
                hint="Detaches them from your clinic and frees their seat. Past records stay."
                confirm-text="Remove" tone="danger" :busy="busy === 'remove'" :disabled="busy !== ''" @confirm="remove" />
            </section>
          </template>

          <div v-if="errorMsg" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
            <p class="text-xs text-red-600">{{ errorMsg }}</p>
          </div>

          <button v-if="credentials" type="button" @click="$emit('close')"
            class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { staffService, type Credentials } from '@/services/staff.service'
import type { Branch, Profile } from '@/types'
import CredentialsCard from './CredentialsCard.vue'
import ConfirmRow from './ConfirmRow.vue'

const props = defineProps<{
  member: Profile
  email: string | null
  branches: Branch[]
  clinicName: string
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>()

const ROLES = [{ value: 'doctor', label: '🩺 Doctor' }, { value: 'staff', label: '🧑‍💼 Staff' }] as const
const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-slate-50 focus:bg-white transition-all'

const form = ref({
  full_name: props.member.full_name ?? '',
  role: (props.member.role === 'doctor' ? 'doctor' : 'staff') as 'doctor' | 'staff',
  branch_id: props.member.branch_id ?? '',
})
const busy = ref<'' | 'save' | 'reset' | 'active' | 'remove'>('')
const errorMsg = ref('')
const credentials = ref<Credentials | null>(null)

const changed = computed(() =>
  form.value.full_name.trim() !== (props.member.full_name ?? '') ||
  form.value.role !== props.member.role ||
  form.value.branch_id !== (props.member.branch_id ?? ''))

async function run(kind: typeof busy.value, work: () => Promise<string | null>, after?: () => void) {
  busy.value = kind
  errorMsg.value = ''
  const error = await work()
  busy.value = ''
  if (error) { errorMsg.value = error; return }
  emit('changed')
  after?.()
}

const save = () => run('save', async () => {
  const { error } = await staffService.update(props.member.id, {
    full_name: form.value.full_name.trim(), role: form.value.role, branch_id: form.value.branch_id || null,
  })
  return error
}, () => emit('close'))

const resetPassword = () => run('reset', async () => {
  const { data, error } = await staffService.resetPassword(props.member.id)
  if (data) credentials.value = data
  return error
})

const setActive = (active: boolean) => run('active', async () => (await staffService.setActive(props.member.id, active)).error,
  () => emit('close'))

const remove = () => run('remove', async () => (await staffService.remove('', props.member.id)).error,
  () => emit('close'))
</script>
