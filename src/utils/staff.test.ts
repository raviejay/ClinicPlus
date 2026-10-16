import { describe, expect, it } from 'vitest'
import { filterMembers, lastSignInLabel, loginDetailsMessage } from './staff'
import type { Profile } from '@/types'

const now = new Date('2026-10-16T08:00:00Z')

describe('last sign-in label', () => {
  it('says never when there is no sign-in', () => {
    expect(lastSignInLabel(null, now)).toBe('Never signed in')
    expect(lastSignInLabel('garbage', now)).toBe('Never signed in')
  })
  it('is relative for recent sign-ins', () => {
    expect(lastSignInLabel('2026-10-16T01:00:00Z', now)).toBe('Signed in today')
    expect(lastSignInLabel('2026-10-15T01:00:00Z', now)).toBe('Signed in yesterday')
    expect(lastSignInLabel('2026-10-11T07:00:00Z', now)).toBe('Signed in 5 days ago')
  })
  it('shows the date once it is a month or more ago', () => {
    expect(lastSignInLabel('2026-07-04T00:00:00Z', now)).toContain('2026')
  })
})

const member = (id: string, name: string, role: Profile['role'], active = true): Profile => ({
  id, clinic_id: 'c', branch_id: null, full_name: name, role, is_active: active, created_at: '',
})
const team = [
  member('1', 'Maria Reyes', 'doctor'), member('2', 'Shan Cruz', 'staff'),
  member('3', 'Admin Ann', 'admin'), member('4', 'Old Timer', 'staff', false),
]
const emails = { '1': 'maria@clinic.ph', '2': 'shan@clinic.ph', '3': null, '4': 'old@clinic.ph' }

describe('filtering the team', () => {
  it('returns everyone by default', () => expect(filterMembers(team, emails, '', 'all')).toHaveLength(4))
  it('filters by role', () => {
    expect(filterMembers(team, emails, '', 'doctor').map(m => m.id)).toEqual(['1'])
    expect(filterMembers(team, emails, '', 'staff').map(m => m.id)).toEqual(['2', '4'])
  })
  it('shows only deactivated accounts under the inactive filter', () => {
    expect(filterMembers(team, emails, '', 'inactive').map(m => m.id)).toEqual(['4'])
  })
  it('searches names and emails, ignoring case', () => {
    expect(filterMembers(team, emails, 'MARIA', 'all').map(m => m.id)).toEqual(['1'])
    expect(filterMembers(team, emails, 'shan@', 'all').map(m => m.id)).toEqual(['2'])
  })
  it('combines search and role', () => {
    expect(filterMembers(team, emails, 'shan', 'doctor')).toEqual([])
  })
})

describe('login details message', () => {
  it('includes everything a new member needs', () => {
    const text = loginDetailsMessage('Demo Clinic', 'https://app/login', 'a@b.ph', 'Cg-abc9')
    for (const part of ['Demo Clinic', 'https://app/login', 'a@b.ph', 'Cg-abc9']) expect(text).toContain(part)
  })
})
