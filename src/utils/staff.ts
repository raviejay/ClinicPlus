import type { Profile } from '@/types'

/** "Never signed in", "Signed in today", "Signed in 3 days ago", "Signed in Mar 4, 2026" */
export function lastSignInLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return 'Never signed in'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'Never signed in'
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000)
  if (days < 1) return 'Signed in today'
  if (days === 1) return 'Signed in yesterday'
  if (days < 30) return `Signed in ${days} days ago`
  return `Signed in ${then.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export type RoleFilter = 'all' | 'doctor' | 'staff' | 'admin' | 'inactive'

export function filterMembers(
  members: Profile[],
  emails: Record<string, string | null>,
  query: string,
  role: RoleFilter,
): Profile[] {
  const q = query.trim().toLowerCase()
  return members.filter(m => {
    if (role === 'inactive') { if (m.is_active !== false) return false }
    else if (role !== 'all' && m.role !== role) return false
    if (!q) return true
    return (m.full_name ?? '').toLowerCase().includes(q) || (emails[m.id] ?? '').toLowerCase().includes(q)
  })
}

/** What an admin sends a new or reset team member */
export function loginDetailsMessage(clinicName: string, loginUrl: string, email: string, password: string): string {
  return [
    `Your ${clinicName} account on ClinicGo is ready.`,
    `Sign in: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary password: ${password}`,
    'Please change your password after signing in.',
  ].join('\n')
}
