/** Plain-language versions of what Supabase's auth errors say */
export function friendlyAuthError(message: string | null | undefined): string {
  const m = (message ?? '').toLowerCase()
  if (!m) return 'Something went wrong. Please try again.'
  if (m.includes('invalid login credentials')) return 'That email and password do not match. Check them and try again.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the confirmation link.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_request_rate')) {
    return 'Too many attempts. Please wait a few minutes before trying again.'
  }
  if (m.includes('captcha')) return 'We could not verify that you are human. Please try the check again.'
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (m.includes('same password') || m.includes('different from the old')) return 'Choose a password you have not used before.'
  if (m.includes('password should be at least') || m.includes('weak')) return 'That password is too weak. Use at least 8 characters.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your internet connection.'
  if (m.includes('expired') || m.includes('invalid') && m.includes('token')) return 'This link has expired. Please request a new one.'
  return message as string
}

/** After this many wrong attempts in a row the form pauses for a short while */
export const MAX_ATTEMPTS = 5
export const LOCKOUT_SECONDS = [30, 60, 120, 300]

/** How long to pause after `failures` wrong attempts in a row (0 = no pause yet) */
export function lockoutSeconds(failures: number): number {
  if (failures < MAX_ATTEMPTS) return 0
  const step = Math.min(failures - MAX_ATTEMPTS, LOCKOUT_SECONDS.length - 1)
  return LOCKOUT_SECONDS[step]
}

export interface PasswordCheck {
  /** 0 (empty) to 4 (strong) */
  score: 0 | 1 | 2 | 3 | 4
  label: string
  ok: boolean
}

export const MIN_PASSWORD_LENGTH = 8

/** A simple, honest strength guide: length first, then a mix of character types */
export function checkPassword(password: string): PasswordCheck {
  if (!password) return { score: 0, label: '', ok: false }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 1, label: `Use at least ${MIN_PASSWORD_LENGTH} characters`, ok: false }
  if (/^(.)\1+$/.test(password) || ['password', '12345678', 'qwertyui'].includes(password.toLowerCase())) {
    return { score: 1, label: 'Too easy to guess', ok: false }
  }
  if (password.length >= 12 && kinds >= 3) return { score: 4, label: 'Strong', ok: true }
  if (kinds >= 3 || password.length >= 12) return { score: 3, label: 'Good', ok: true }
  return { score: 2, label: 'Okay. Add numbers or symbols to strengthen it', ok: true }
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
