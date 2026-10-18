import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  push: vi.fn(), replace: vi.fn(),
  login: vi.fn(), signup: vi.fn(), profile: { clinic_id: 'c1' } as { clinic_id: string | null },
  requestPasswordReset: vi.fn(), updatePassword: vi.fn(), logout: vi.fn(), getSession: vi.fn(),
  authListener: null as null | ((event: string, session: unknown) => void),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.query }),
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('@/stores/auth', () => ({
  DEACTIVATED_MESSAGE: 'This account has been deactivated. Please contact your clinic admin.',
  useAuthStore: () => ({ login: mocks.login, signup: mocks.signup, get profile() { return mocks.profile } }),
}))
vi.mock('@/services/auth.service', () => ({
  authService: {
    requestPasswordReset: mocks.requestPasswordReset, updatePassword: mocks.updatePassword,
    logout: mocks.logout, getSession: mocks.getSession,
    onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
      mocks.authListener = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    },
  },
}))

import LoginPage from './LoginPage.vue'
import RegisterPage from './RegisterPage.vue'
import ForgotPasswordPage from './ForgotPasswordPage.vue'
import ResetPasswordPage from './ResetPasswordPage.vue'

const stubs = { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, AppLogo: true }
let wrapper: VueWrapper
const mountPage = async (component: object) => {
  wrapper = mount(component, { attachTo: document.body, global: { stubs } })
  await flushPromises()
}
const submit = async () => { await wrapper.find('form').trigger('submit'); await flushPromises() }
const button = (text: string) => wrapper.findAll('button').find(b => b.text().includes(text))!

beforeEach(() => {
  mocks.query = {}
  mocks.profile = { clinic_id: 'c1' }
  mocks.login.mockResolvedValue({ error: null })
  mocks.signup.mockResolvedValue({ error: null })
  mocks.requestPasswordReset.mockResolvedValue({ data: null, error: null })
  mocks.updatePassword.mockResolvedValue({ data: null, error: null })
  mocks.logout.mockResolvedValue(undefined)
  mocks.getSession.mockResolvedValue(null)
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllEnvs()
  delete (window as any).turnstile
  vi.useRealTimers()
  vi.clearAllMocks()
})

async function signInWith(email: string, password: string) {
  await wrapper.find('#login-email').setValue(email)
  await wrapper.find('#login-password').setValue(password)
  await submit()
}

describe('login', () => {
  it('signs in and goes to the dashboard', async () => {
    await mountPage(LoginPage)
    await signInWith(' juan@clinic.ph ', 'secret-pass')
    expect(mocks.login).toHaveBeenCalledWith('juan@clinic.ph', 'secret-pass', undefined)
    expect(mocks.push).toHaveBeenCalledWith('/dashboard')
  })

  it('sends a new account to clinic setup', async () => {
    mocks.profile = { clinic_id: null }
    await mountPage(LoginPage)
    await signInWith('juan@clinic.ph', 'secret-pass')
    expect(mocks.push).toHaveBeenCalledWith('/clinic-setup')
  })

  it('checks the form before asking the server', async () => {
    await mountPage(LoginPage)
    await signInWith('not-an-email', 'x')
    expect(wrapper.text()).toContain('Enter the email you signed up with')
    await signInWith('juan@clinic.ph', '')
    expect(wrapper.text()).toContain('Enter your password')
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it('explains a wrong password in plain words', async () => {
    mocks.login.mockResolvedValue({ error: 'Invalid login credentials' })
    await mountPage(LoginPage)
    await signInWith('juan@clinic.ph', 'wrong')
    expect(wrapper.find('[role="alert"]').text()).toContain('do not match')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('shows the deactivated message as it is', async () => {
    mocks.login.mockResolvedValue({ error: 'This account has been deactivated. Please contact your clinic admin.' })
    await mountPage(LoginPage)
    await signInWith('juan@clinic.ph', 'pw')
    expect(wrapper.find('[role="alert"]').text()).toContain('deactivated')
  })

  it('pauses after five wrong passwords in a row, with a countdown and a way to reset', async () => {
    vi.useFakeTimers()
    mocks.login.mockResolvedValue({ error: 'Invalid login credentials' })
    await mountPage(LoginPage)
    for (let i = 0; i < 5; i++) await signInWith('juan@clinic.ph', `wrong${i}`)
    expect(wrapper.text()).toContain('Too many wrong attempts')
    expect(wrapper.text()).toContain('30s')
    expect(button('Sign In').attributes('disabled')).toBeDefined()
    expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
    const calls = mocks.login.mock.calls.length
    await submit()
    expect(mocks.login.mock.calls.length).toBe(calls) // still paused
    await vi.advanceTimersByTimeAsync(31_000)
    await flushPromises()
    expect(button('Sign In').attributes('disabled')).toBeUndefined()
  })

  it('does not count network problems as wrong passwords', async () => {
    mocks.login.mockResolvedValue({ error: 'Failed to fetch' })
    await mountPage(LoginPage)
    for (let i = 0; i < 6; i++) await signInWith('juan@clinic.ph', 'pw')
    expect(wrapper.text()).not.toContain('Too many wrong attempts')
    expect(wrapper.find('[role="alert"]').text()).toContain('internet connection')
  })

  it('shows and hides the password, and warns about Caps Lock', async () => {
    await mountPage(LoginPage)
    const input = wrapper.find('#login-password')
    expect(input.attributes('type')).toBe('password')
    await wrapper.find('[aria-label="Show password"]').trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(wrapper.find('[aria-label="Hide password"]').exists()).toBe(true)
    await input.trigger('keydown', { key: 'a' })
    expect(wrapper.text()).not.toContain('Caps Lock')
    const event = new KeyboardEvent('keydown', { key: 'a', modifierCapsLock: true })
    input.element.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.text()).toContain('Caps Lock is on')
  })

  it('uses the right autofill hints and links forgotten passwords to the reset page', async () => {
    await mountPage(LoginPage)
    expect(wrapper.find('#login-email').attributes('autocomplete')).toBe('username')
    expect(wrapper.find('#login-password').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.find('a[href="/forgot-password"]').text()).toContain('Forgot password?')
    expect(wrapper.find('label[for="login-email"]').exists()).toBe(true)
  })

  it('confirms a password change after a reset', async () => {
    mocks.query = { reset: '1' }
    await mountPage(LoginPage)
    expect(wrapper.text()).toContain('Your password was changed')
  })

  it('tells someone deactivated while signed in why they were sent here', async () => {
    mocks.query = { deactivated: '1' }
    await mountPage(LoginPage)
    expect(wrapper.text()).toContain('deactivated')
  })
})

describe('human check (Cloudflare Turnstile)', () => {
  function fakeTurnstile() {
    const t = { render: vi.fn((_el: HTMLElement, opts: any) => { (t as any).opts = opts; return 'w1' }), reset: vi.fn(), remove: vi.fn() }
    ;(window as any).turnstile = t
    return t as typeof t & { opts: any }
  }

  it('is not drawn and does not block signing in when no site key is set', async () => {
    await mountPage(LoginPage)
    expect(button('Sign In').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[aria-label="Human check"]').exists()).toBe(false)
  })

  it('holds the button until the check passes, then sends the token, and asks for a fresh one after each try', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-123')
    const t = fakeTurnstile()
    mocks.login.mockResolvedValue({ error: 'Invalid login credentials' })
    await mountPage(LoginPage)
    expect(t.render).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sitekey: 'site-key-123' }))
    expect(button('Sign In').attributes('disabled')).toBeDefined()

    t.opts.callback('token-abc')
    await flushPromises()
    expect(button('Sign In').attributes('disabled')).toBeUndefined()
    await signInWith('juan@clinic.ph', 'wrong')
    expect(mocks.login).toHaveBeenCalledWith('juan@clinic.ph', 'wrong', 'token-abc')
    expect(t.reset).toHaveBeenCalled()
    expect(button('Sign In').attributes('disabled')).toBeDefined() // needs a new token
  })

  it('blocks again when the token expires', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-123')
    const t = fakeTurnstile()
    await mountPage(LoginPage)
    t.opts.callback('token-abc')
    await flushPromises()
    t.opts['expired-callback']()
    await flushPromises()
    expect(button('Sign In').attributes('disabled')).toBeDefined()
  })
})

describe('register', () => {
  const fill = async (email: string, password: string, confirm: string) => {
    await wrapper.find('#reg-email').setValue(email)
    await wrapper.find('#reg-password').setValue(password)
    await wrapper.find('#reg-confirm').setValue(confirm)
    await submit()
  }

  it('creates the account and continues to clinic setup', async () => {
    await mountPage(RegisterPage)
    await fill('new@clinic.ph', 'Clinic-Go-2026!', 'Clinic-Go-2026!')
    expect(mocks.signup).toHaveBeenCalledWith('new@clinic.ph', 'Clinic-Go-2026!', undefined)
    expect(mocks.push).toHaveBeenCalledWith('/clinic-setup')
  })

  it('refuses weak passwords, mismatches and bad emails before asking the server', async () => {
    await mountPage(RegisterPage)
    await fill('new@clinic.ph', 'short', 'short')
    expect(wrapper.text()).toContain('at least 8 characters')
    await fill('new@clinic.ph', 'Clinic-Go-2026!', 'Clinic-Go-2027!')
    expect(wrapper.text()).toContain('Passwords do not match')
    await fill('nope', 'Clinic-Go-2026!', 'Clinic-Go-2026!')
    expect(wrapper.text()).toContain('valid email')
    expect(mocks.signup).not.toHaveBeenCalled()
  })

  it('shows how strong the password is as it is typed', async () => {
    await mountPage(RegisterPage)
    await wrapper.find('#reg-password').setValue('Clinic-Go-2026!')
    expect(wrapper.text()).toContain('Strong')
  })

  it('explains an email that is already registered', async () => {
    mocks.signup.mockResolvedValue({ error: 'User already registered' })
    await mountPage(RegisterPage)
    await fill('new@clinic.ph', 'Clinic-Go-2026!', 'Clinic-Go-2026!')
    expect(wrapper.find('[role="alert"]').text()).toContain('already exists')
  })
})

describe('forgot password', () => {
  it('sends the link and says the same thing whether or not the account exists', async () => {
    await mountPage(ForgotPasswordPage)
    await wrapper.find('#forgot-email').setValue('juan@clinic.ph')
    await submit()
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('juan@clinic.ph', undefined)
    expect(wrapper.text()).toContain('Check your email')
    expect(wrapper.text()).toContain('If an account exists')
  })

  it('shows the same message even if the server says the email is unknown', async () => {
    mocks.requestPasswordReset.mockResolvedValue({ data: null, error: 'User not found' })
    await mountPage(ForgotPasswordPage)
    await wrapper.find('#forgot-email').setValue('ghost@clinic.ph')
    await submit()
    expect(wrapper.text()).toContain('If an account exists')
  })

  it('does report limits and connection problems', async () => {
    mocks.requestPasswordReset.mockResolvedValue({ data: null, error: 'email rate limit exceeded' })
    await mountPage(ForgotPasswordPage)
    await wrapper.find('#forgot-email').setValue('juan@clinic.ph')
    await submit()
    expect(wrapper.find('[role="alert"]').text()).toContain('Too many attempts')
    expect(wrapper.text()).not.toContain('Check your email')
  })

  it('checks the email first', async () => {
    await mountPage(ForgotPasswordPage)
    await wrapper.find('#forgot-email').setValue('nope')
    await submit()
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter the email you signed up with')
  })

  it('makes people wait a minute before sending again', async () => {
    vi.useFakeTimers()
    await mountPage(ForgotPasswordPage)
    await wrapper.find('#forgot-email').setValue('juan@clinic.ph')
    await submit()
    expect(button('Send again in 60s').attributes('disabled')).toBeDefined()
    await vi.advanceTimersByTimeAsync(61_000)
    await flushPromises()
    expect(button('Send it again').attributes('disabled')).toBeUndefined()
  })
})

describe('reset password', () => {
  it('asks for a new link when there is no valid recovery session', async () => {
    vi.useFakeTimers()
    await mountPage(ResetPasswordPage)
    expect(wrapper.find('[role="status"]').exists()).toBe(true) // still checking
    await vi.advanceTimersByTimeAsync(4500)
    await flushPromises()
    expect(wrapper.text()).toContain('This link is no longer valid')
    expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
  })

  it('shows the form once the emailed link has signed the person in', async () => {
    await mountPage(ResetPasswordPage)
    mocks.authListener!('PASSWORD_RECOVERY', { user: {} })
    await flushPromises()
    expect(wrapper.find('#new-password').exists()).toBe(true)
  })

  it('shows the form straight away when the session already exists', async () => {
    mocks.getSession.mockResolvedValue({ user: {} })
    await mountPage(ResetPasswordPage)
    expect(wrapper.find('#new-password').exists()).toBe(true)
  })

  it('refuses weak or mismatched passwords', async () => {
    mocks.getSession.mockResolvedValue({ user: {} })
    await mountPage(ResetPasswordPage)
    await wrapper.find('#new-password').setValue('short')
    await wrapper.find('#confirm-password').setValue('short')
    await submit()
    expect(wrapper.text()).toContain('at least 8 characters')
    await wrapper.find('#new-password').setValue('Clinic-Go-2026!')
    await wrapper.find('#confirm-password').setValue('different')
    await submit()
    expect(wrapper.text()).toContain('Passwords do not match')
    expect(mocks.updatePassword).not.toHaveBeenCalled()
  })

  it('changes the password, signs out and sends them to sign in with a confirmation', async () => {
    mocks.getSession.mockResolvedValue({ user: {} })
    await mountPage(ResetPasswordPage)
    await wrapper.find('#new-password').setValue('Clinic-Go-2026!')
    await wrapper.find('#confirm-password').setValue('Clinic-Go-2026!')
    await submit()
    expect(mocks.updatePassword).toHaveBeenCalledWith('Clinic-Go-2026!')
    expect(mocks.logout).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/login', query: { reset: '1' } })
  })

  it('shows a clear message when the new password is the same as the old one', async () => {
    mocks.getSession.mockResolvedValue({ user: {} })
    mocks.updatePassword.mockResolvedValue({ data: null, error: 'New password should be different from the old password.' })
    await mountPage(ResetPasswordPage)
    await wrapper.find('#new-password').setValue('Clinic-Go-2026!')
    await wrapper.find('#confirm-password').setValue('Clinic-Go-2026!')
    await submit()
    expect(wrapper.find('[role="alert"]').text()).toContain('not used before')
    expect(mocks.logout).not.toHaveBeenCalled()
  })
})
