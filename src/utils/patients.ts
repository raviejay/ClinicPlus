import type { Gender, Patient } from '@/types'
import { addDays } from '@/utils/booking'
import { parseDbTimestamp } from '@/utils/billing'

export type AgeGroup = 'all' | 'child' | 'teen' | 'adult' | 'senior' | 'unknown'
export type AddedRange = 'any' | '7d' | '30d' | 'year'
export type PatientSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'age-asc' | 'age-desc'

export interface PatientFilters {
  gender: 'all' | Gender | 'unknown'
  age: AgeGroup
  added: AddedRange
  /** Only patients whose profile is missing something clinics usually need */
  incomplete: boolean
  sort: PatientSort
}

export const DEFAULT_FILTERS: PatientFilters = { gender: 'all', age: 'all', added: 'any', incomplete: false, sort: 'newest' }

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: 'all', label: 'Any age' },
  { value: 'child', label: 'Children (0–12)' },
  { value: 'teen', label: 'Teens (13–17)' },
  { value: 'adult', label: 'Adults (18–59)' },
  { value: 'senior', label: 'Seniors (60+)' },
  { value: 'unknown', label: 'No birthdate' },
]

/** Whole years on `today` (YYYY-MM-DD), or null without a usable birthdate */
export function ageOn(birthdate: string | null | undefined, today: string): number | null {
  if (!birthdate || !/^\d{4}-\d{2}-\d{2}/.test(birthdate)) return null
  const [by, bm, bd] = birthdate.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  if (by > ty || (by === ty && (bm > tm || (bm === tm && bd > td)))) return null // born in the future
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age
}

export function ageGroupOf(age: number | null): Exclude<AgeGroup, 'all'> {
  if (age === null) return 'unknown'
  if (age <= 12) return 'child'
  if (age <= 17) return 'teen'
  if (age <= 59) return 'adult'
  return 'senior'
}

/** "34 yrs", "8 mo" for babies, "" when unknown */
export function ageLabel(age: number | null, birthdate: string | null | undefined, today: string): string {
  if (age === null) return ''
  if (age >= 1) return `${age} yr${age === 1 ? '' : 's'}`
  if (!birthdate) return ''
  const [by, bm] = birthdate.split('-').map(Number)
  const [ty, tm] = today.split('-').map(Number)
  const months = Math.max(0, (ty - by) * 12 + (tm - bm) - (Number(today.slice(8, 10)) < Number(birthdate.slice(8, 10)) ? 1 : 0))
  return `${months} mo`
}

export const isIncomplete = (p: Patient) => !p.birthdate || !p.gender || !p.email

/** The patient's registration day in Manila, YYYY-MM-DD */
export function addedOn(p: Patient): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(parseDbTimestamp(p.created_at))
}

function addedSince(range: AddedRange, today: string): string | null {
  if (range === '7d') return addDays(today, -6)
  if (range === '30d') return addDays(today, -29)
  if (range === 'year') return `${today.slice(0, 4)}-01-01`
  return null
}

export function filterPatients(patients: Patient[], f: PatientFilters, today: string): Patient[] {
  const since = addedSince(f.added, today)
  return patients.filter(p => {
    if (f.gender === 'unknown') { if (p.gender) return false }
    else if (f.gender !== 'all' && p.gender !== f.gender) return false
    if (f.age !== 'all' && ageGroupOf(ageOn(p.birthdate, today)) !== f.age) return false
    if (since && addedOn(p) < since) return false
    if (f.incomplete && !isIncomplete(p)) return false
    return true
  })
}

export function sortPatients(patients: Patient[], sort: PatientSort, today: string): Patient[] {
  const byName = (a: Patient, b: Patient) => a.full_name.localeCompare(b.full_name, 'en', { sensitivity: 'base' })
  const time = (p: Patient) => parseDbTimestamp(p.created_at).getTime()
  const age = (p: Patient) => ageOn(p.birthdate, today)
  const copy = [...patients]
  switch (sort) {
    case 'oldest': return copy.sort((a, b) => time(a) - time(b))
    case 'name-asc': return copy.sort(byName)
    case 'name-desc': return copy.sort((a, b) => byName(b, a))
    // Patients without a birthdate always go last, whichever way the ages run
    case 'age-asc': return copy.sort((a, b) => (age(a) ?? Infinity) - (age(b) ?? Infinity) || byName(a, b))
    case 'age-desc': return copy.sort((a, b) => (age(b) ?? -Infinity) - (age(a) ?? -Infinity) || byName(a, b))
    default: return copy.sort((a, b) => time(b) - time(a))
  }
}

/** How many filters are switched on (sorting does not count) */
export function activeFilterCount(f: PatientFilters): number {
  return (f.gender !== 'all' ? 1 : 0) + (f.age !== 'all' ? 1 : 0) + (f.added !== 'any' ? 1 : 0) + (f.incomplete ? 1 : 0)
}
