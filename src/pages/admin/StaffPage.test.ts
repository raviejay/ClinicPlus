import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(), getDetails: vi.fn(), invite: vi.fn(), resetPassword: vi.fn(),
  setActive: vi.fn(), update: vi.fn(), remove: vi.fn(),
  getBranches: vi.fn(), checkStaffLimit: vi.fn(),
}))

vi.mock('vue-router', () => ({ RouterLink: { template: '<a><slot /></a>' } }))
vi.mock('@/layouts/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'me' }, clinic: { id: 'clinic-1', name: 'Demo Clinic' } }),
}))
vi.mock('@/composables/useClinic', async () => {
  const { ref } = await import('vue')
  return { useClinic: () => ({ plan: ref('pro'), isTrialActive: ref(false) }) }
})
vi.mock('@/services/staff.service', () => ({
  staffService: {
    getAll: mocks.getAll, getDetails: mocks.getDetails, invite: mocks.invite, resetPassword: mocks.resetPassword,
    setActive: mocks.setActive, update: mocks.update, remove: mocks.remove,
  },
}))
vi.mock('@/services/branch.service', () => ({ branchService: { getAll: mocks.getBranches } }))
vi.mock('@/services/planRestriction.service', () => ({ planRestrictionService: { checkStaffLimit: mocks.checkStaffLimit } }))

import StaffPage from './StaffPage.vue'

const member = (id: string, name: string, role: string, extra: Record<string, unknown> = {}) =>
  ({ id, clinic_id: 'clinic-1', branch_id: null, full_name: name, role, is_active: true, created_at: '', ...extra })

const team = [
  member('me', 'Admin Ann', 'admin'),
  member('d1', 'Maria Reyes', 'doctor'),
  member('s1', 'Shan Cruz', 'staff'),
  member('s2', 'Old Timer', 'staff', { is_active: false }),
]
const details = [
  { id: 'me', email: 'ann@clinic.ph', last_sign_in_at: new Date().toISOString() },
  { id: 'd1', email: 'maria@clinic.ph', last_sign_in_at: null },
  { id: 's1', email: 'shan@clinic.ph', last_sign_in_at: new Date(Date.now() - 3 * 86_400_000).toISOString() },
  { id: 's2', email: 'old@clinic.ph', last_sign_in_at: null },
]

let wrapper: VueWrapper
const mountPage = async () => {
  wrapper = mount(StaffPage, { attachTo: document.body })
  await flushPromises()
}
const button = (text: string) => {
  const found = [...document.body.querySelectorAll('button')].find(b => b.textContent?.trim().endsWith(text)) as HTMLButtonElement | undefined
  if (!found) throw new Error(`no button "${text}"`)
  return found
}
const click = async (text: string) => { button(text).click(); await flushPromises() }
const manage = async (name: string) => {
  ;(document.body.querySelector(`[aria-label="Manage ${name}"]`) as HTMLButtonElement).click()
  await flushPromises()
}

beforeEach(() => {
  mocks.getAll.mockResolvedValue({ data: team, error: null })
  mocks.getDetails.mockResolvedValue({ data: details, error: null })
  mocks.getBranches.mockResolvedValue({ data: [{ id: 'b1', name: 'Main St' }], error: null })
  mocks.checkStaffLimit.mockResolvedValue({ data: { allowed: true, current: 4, max: 10 }, error: null })
  mocks.resetPassword.mockResolvedValue({ data: { email: 'shan@clinic.ph', password: 'Cg-NewPass9' }, error: null })
  mocks.setActive.mockResolvedValue({ data: null, error: null })
  mocks.update.mockResolvedValue({ data: null, error: null })
  mocks.remove.mockResolvedValue({ data: null, error: null })
  mocks.invite.mockResolvedValue({ data: { email: 'new@clinic.ph', password: 'Cg-Fresh999' }, error: null })
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('team list', () => {
  it('shows emails, last sign-in and deactivated accounts', async () => {
    await mountPage()
    const text = wrapper.text()
    expect(text).toContain('maria@clinic.ph')
    expect(text).toContain('Never signed in')
    expect(text).toContain('Signed in 3 days ago')
    expect(text).toContain('Deactivated')
    expect(text).toContain('4 members · 1 deactivated')
  })

  it('lets you manage doctors and staff, but not admins or yourself', async () => {
    await mountPage()
    expect(wrapper.find('[aria-label="Manage Maria Reyes"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Manage Shan Cruz"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Manage Admin Ann"]').exists()).toBe(false)
  })

  it('still lists everyone when the email details cannot be loaded', async () => {
    mocks.getDetails.mockResolvedValue({ data: null, error: 'boom' })
    await mountPage()
    expect(wrapper.text()).toContain('Maria Reyes')
    expect(wrapper.text()).not.toContain('maria@clinic.ph')
  })

  it('searches by name or email', async () => {
    await mountPage()
    await wrapper.find('input[type="search"]').setValue('shan@')
    expect(wrapper.text()).toContain('Shan Cruz')
    expect(wrapper.text()).not.toContain('Maria Reyes')
    await wrapper.find('input[type="search"]').setValue('nobody')
    expect(wrapper.text()).toContain('No one matches that')
  })

  it('filters by role and to deactivated accounts', async () => {
    await mountPage()
    await wrapper.findAll('[role="tab"]').find(t => t.text().startsWith('Doctors'))!.trigger('click')
    expect(wrapper.text()).toContain('Maria Reyes')
    expect(wrapper.text()).not.toContain('Shan Cruz')
    await wrapper.findAll('[role="tab"]').find(t => t.text().startsWith('Deactivated'))!.trigger('click')
    expect(wrapper.text()).toContain('Old Timer')
    expect(wrapper.text()).not.toContain('Maria Reyes')
  })
})

describe('managing a member', () => {
  it('resets a password only after confirming, then shows the new login once', async () => {
    await mountPage()
    await manage('Shan Cruz')
    await click('Reset')
    expect(mocks.resetPassword).not.toHaveBeenCalled()
    await click('Reset it')
    expect(mocks.resetPassword).toHaveBeenCalledWith('s1')
    expect(document.body.textContent).toContain('Cg-NewPass9')
    expect(document.body.textContent).toContain('shan@clinic.ph')
  })

  it('deactivates after confirming and refreshes the list', async () => {
    await mountPage()
    await manage('Maria Reyes')
    await click('Deactivate')
    await click('Deactivate') // now the confirm button
    expect(mocks.setActive).toHaveBeenCalledWith('d1', false)
    expect(mocks.getAll.mock.calls.length).toBeGreaterThan(1)
  })

  it('offers reactivation for a deactivated account', async () => {
    await mountPage()
    await manage('Old Timer')
    expect(document.body.textContent).toContain('This account is deactivated')
    await click('Reactivate')
    await click('Reactivate')
    expect(mocks.setActive).toHaveBeenCalledWith('s2', true)
  })

  it('saves a changed name, role and branch', async () => {
    await mountPage()
    await manage('Shan Cruz')
    const save = () => button('Save changes')
    expect(save().disabled).toBe(true)
    const name = document.body.querySelector('#sm-name') as HTMLInputElement
    name.value = 'Shan C. Cruz'
    name.dispatchEvent(new Event('input'))
    await click('Doctor')
    const branch = document.body.querySelector('#sm-branch') as HTMLSelectElement
    branch.value = 'b1'
    branch.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(save().disabled).toBe(false)
    await click('Save changes')
    expect(mocks.update).toHaveBeenCalledWith('s1', { full_name: 'Shan C. Cruz', role: 'doctor', branch_id: 'b1' })
  })

  it('removes after confirming', async () => {
    await mountPage()
    await manage('Shan Cruz')
    await click('Remove')
    await click('Remove')
    expect(mocks.remove).toHaveBeenCalled()
    expect(mocks.remove.mock.calls[0][1]).toBe('s1')
  })

  it('shows the server error and keeps the dialog open', async () => {
    mocks.resetPassword.mockResolvedValue({ data: null, error: 'Team member not found' })
    await mountPage()
    await manage('Shan Cruz')
    await click('Reset')
    await click('Reset it')
    expect(document.body.textContent).toContain('Team member not found')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe('adding a member', () => {
  it('sends the branch with the invitation and shows the new login', async () => {
    await mountPage()
    await click('Add')
    ;(document.body.querySelector('#add-name') as HTMLInputElement).value = 'New Nurse'
    document.body.querySelector('#add-name')!.dispatchEvent(new Event('input'))
    ;(document.body.querySelector('#add-email') as HTMLInputElement).value = 'new@clinic.ph'
    document.body.querySelector('#add-email')!.dispatchEvent(new Event('input'))
    const branch = document.body.querySelector('#add-branch') as HTMLSelectElement
    branch.value = 'b1'
    branch.dispatchEvent(new Event('change'))
    await flushPromises()
    await click('Add Team Member')
    expect(mocks.invite).toHaveBeenCalledWith({ email: 'new@clinic.ph', full_name: 'New Nurse', role: 'doctor', branch_id: 'b1' })
    expect(document.body.textContent).toContain('Cg-Fresh999')
  })
})
