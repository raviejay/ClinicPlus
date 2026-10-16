import { describe, expect, it } from 'vitest'
import {
  activeFilterCount, ageGroupOf, ageLabel, ageOn, DEFAULT_FILTERS, filterPatients, isIncomplete, sortPatients,
  type PatientFilters,
} from './patients'
import type { Patient } from '@/types'

const TODAY = '2026-10-16'
let n = 0
const patient = (over: Partial<Patient>): Patient => ({
  id: `p${++n}`, clinic_id: 'c', branch_id: null, full_name: 'Test', contact_number: '0917', email: 'a@b.ph',
  birthdate: '1990-05-01', gender: 'female', address: null, created_at: '2026-10-01T02:00:00', ...over,
})
const names = (list: Patient[]) => list.map(p => p.full_name)
const f = (over: Partial<PatientFilters>): PatientFilters => ({ ...DEFAULT_FILTERS, ...over })

describe('age', () => {
  it('counts whole years, only after the birthday', () => {
    expect(ageOn('1990-10-16', TODAY)).toBe(36)
    expect(ageOn('1990-10-17', TODAY)).toBe(35)
    expect(ageOn('2000-02-29', TODAY)).toBe(26)
  })
  it('is null without a real birthdate, or one in the future', () => {
    expect(ageOn(null, TODAY)).toBeNull()
    expect(ageOn('not a date', TODAY)).toBeNull()
    expect(ageOn('2030-01-01', TODAY)).toBeNull()
  })
  it('groups ages', () => {
    expect([null, 0, 12, 13, 17, 18, 59, 60].map(ageGroupOf)).toEqual(
      ['unknown', 'child', 'child', 'teen', 'teen', 'adult', 'adult', 'senior'])
  })
  it('labels babies in months', () => {
    expect(ageLabel(0, '2026-05-10', TODAY)).toBe('5 mo')
    expect(ageLabel(1, '2025-10-01', TODAY)).toBe('1 yr')
    expect(ageLabel(34, '1992-01-01', TODAY)).toBe('34 yrs')
    expect(ageLabel(null, null, TODAY)).toBe('')
  })
})

describe('filtering', () => {
  const list = [
    patient({ full_name: 'Ana', gender: 'female', birthdate: '2020-01-01' }),
    patient({ full_name: 'Ben', gender: 'male', birthdate: '1980-03-03' }),
    patient({ full_name: 'Cai', gender: null, birthdate: null, email: null }),
    patient({ full_name: 'Dan', gender: 'male', birthdate: '1950-01-01', created_at: '2026-01-05T00:00:00' }),
  ]
  it('returns everyone by default', () => expect(filterPatients(list, DEFAULT_FILTERS, TODAY)).toHaveLength(4))
  it('filters by gender, including not recorded', () => {
    expect(names(filterPatients(list, f({ gender: 'male' }), TODAY))).toEqual(['Ben', 'Dan'])
    expect(names(filterPatients(list, f({ gender: 'unknown' }), TODAY))).toEqual(['Cai'])
  })
  it('filters by age group', () => {
    expect(names(filterPatients(list, f({ age: 'child' }), TODAY))).toEqual(['Ana'])
    expect(names(filterPatients(list, f({ age: 'senior' }), TODAY))).toEqual(['Dan'])
    expect(names(filterPatients(list, f({ age: 'unknown' }), TODAY))).toEqual(['Cai'])
  })
  it('filters by when they were added (Manila days)', () => {
    expect(names(filterPatients(list, f({ added: '7d' }), TODAY))).toEqual([])
    expect(names(filterPatients(list, f({ added: '30d' }), TODAY))).toEqual(['Ana', 'Ben', 'Cai'])
    expect(names(filterPatients(list, f({ added: 'year' }), TODAY))).toHaveLength(4)
  })
  it('finds incomplete profiles', () => {
    expect(isIncomplete(list[2])).toBe(true)
    expect(names(filterPatients(list, f({ incomplete: true }), TODAY))).toEqual(['Cai'])
  })
  it('combines filters', () => {
    expect(names(filterPatients(list, f({ gender: 'male', age: 'adult' }), TODAY))).toEqual(['Ben'])
  })
  it('counts the switched-on filters but not the sort', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
    expect(activeFilterCount(f({ gender: 'male', incomplete: true, sort: 'name-asc' }))).toBe(2)
  })
})

describe('sorting', () => {
  const list = [
    patient({ full_name: 'bea', birthdate: '2000-01-01', created_at: '2026-10-02T00:00:00' }),
    patient({ full_name: 'Abe', birthdate: null, created_at: '2026-10-03T00:00:00' }),
    patient({ full_name: 'Cy', birthdate: '1960-01-01', created_at: '2026-10-01T00:00:00' }),
  ]
  it('newest and oldest first', () => {
    expect(names(sortPatients(list, 'newest', TODAY))).toEqual(['Abe', 'bea', 'Cy'])
    expect(names(sortPatients(list, 'oldest', TODAY))).toEqual(['Cy', 'bea', 'Abe'])
  })
  it('by name, ignoring case', () => {
    expect(names(sortPatients(list, 'name-asc', TODAY))).toEqual(['Abe', 'bea', 'Cy'])
    expect(names(sortPatients(list, 'name-desc', TODAY))).toEqual(['Cy', 'bea', 'Abe'])
  })
  it('by age, with unknown birthdates last either way', () => {
    expect(names(sortPatients(list, 'age-asc', TODAY))).toEqual(['bea', 'Cy', 'Abe'])
    expect(names(sortPatients(list, 'age-desc', TODAY))).toEqual(['Cy', 'bea', 'Abe'])
  })
  it('does not change the list it was given', () => {
    const before = names(list)
    sortPatients(list, 'name-desc', TODAY)
    expect(names(list)).toEqual(before)
  })
})
