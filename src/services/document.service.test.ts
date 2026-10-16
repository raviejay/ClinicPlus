import { beforeEach, describe, expect, it, vi } from 'vitest'
import { presetLayout } from '@/utils/documents/presets'

// A chainable stand-in for the Supabase query builder that records every call
const h = vi.hoisted(() => {
  const state = { calls: [] as [string, unknown[]][], result: { data: null as unknown, error: null as unknown }, rpcResult: { data: null as unknown, error: null as unknown }, table: '' }
  const chain: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(state.result)
      return (...args: unknown[]) => { state.calls.push([prop, args]); return chain }
    },
  })
  const storage = {
    upload: vi.fn(async () => ({ error: null as unknown })),
    getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } })),
  }
  return { state, chain, storage, rpc: vi.fn(async (..._a: unknown[]) => state.rpcResult), from: vi.fn((t: string) => { state.table = t; return chain }) }
})

vi.mock('./supabase', () => ({ supabase: { from: h.from, rpc: h.rpc, storage: { from: () => h.storage } } }))
vi.mock('@/composables/useBranchFilter', () => ({
  useBranchFilter: () => ({ buildBranchFilter: (q: any) => q.is('branch_id', null) }),
}))

import { documentService } from './document.service'

const called = (name: string) => h.state.calls.filter(([n]) => n === name).map(([, a]) => a)

beforeEach(() => {
  h.state.calls = []
  h.state.result = { data: null, error: null }
  h.state.rpcResult = { data: null, error: null }
  h.storage.upload.mockClear()
  h.rpc.mockClear()
})

const hostile = {
  version: 1,
  paper: { size: 'a4', orientation: 'portrait', margin: 8 },
  elements: [{ id: 'x', type: 'text', x: 1, y: 1, w: 10, h: 10, content: 'hi', color: 'red;background:url(javascript:alert(1))' }, { id: 'y', type: 'iframe', x: 0, y: 0, w: 1, h: 1 }],
}

describe('templates', () => {
  it('cleans a stored layout when reading it', async () => {
    h.state.result = { data: [{ id: 't1', kind: 'medcert', name: 'A', layout: hostile }], error: null }
    const { data } = await documentService.listTemplates('c1')
    expect(data![0].layout.elements).toHaveLength(1)
    expect((data![0].layout.elements[0] as any).color).toBe('#1e293b')
  })
  it('filters by clinic and optionally by type, default first', async () => {
    h.state.result = { data: [], error: null }
    await documentService.listTemplates('c1', 'prescription')
    expect(called('eq')).toContainEqual(['clinic_id', 'c1'])
    expect(called('eq')).toContainEqual(['kind', 'prescription'])
    expect(called('order')[0]).toEqual(['is_default', { ascending: false }])
  })
  it('trims the name when creating and renaming', async () => {
    h.state.result = { data: { id: 't1', layout: presetLayout('medcert', 'classic') }, error: null }
    await documentService.createTemplate({ clinic_id: 'c1', kind: 'medcert', name: '  My pad  ', layout: presetLayout('medcert', 'classic') })
    expect((called('insert')[0][0] as any).name).toBe('My pad')
    await documentService.updateTemplate('t1', { name: '  New  ' })
    expect((called('update')[0][0] as any).name).toBe('New')
  })
  it('passes errors back instead of throwing', async () => {
    h.state.result = { data: null, error: { message: 'permission denied' } }
    expect(await documentService.deleteTemplate('t1')).toEqual({ data: null, error: 'permission denied' })
    expect((await documentService.getTemplate('t1')).error).toBe('permission denied')
  })
})

describe('issued documents', () => {
  it('sends the details to issue_document and cleans the layout that comes back', async () => {
    h.state.rpcResult = { data: { id: 'd1', number: 'MC-000001', layout: hostile, data: { values: { a: 'b' }, medicines: [{ name: 'x' }], logoUrl: 'https://cdn.test/l.png' } }, error: null }
    const layout = presetLayout('medcert', 'classic')
    const out = await documentService.issue({ kind: 'medcert', patient_id: 'p1', doctor_id: 'd2', template_id: null, layout, data: { values: { a: 'b' }, medicines: [] } })
    expect(h.rpc).toHaveBeenCalledWith('issue_document', {
      p_kind: 'medcert', p_patient_id: 'p1', p_doctor_id: 'd2', p_template_id: null, p_layout: layout, p_data: { values: { a: 'b' }, medicines: [] },
    })
    expect(out.data!.number).toBe('MC-000001')
    expect(out.data!.layout.elements).toHaveLength(1)
    expect(out.data!.data.logoUrl).toBe('https://cdn.test/l.png')
  })
  it('tolerates a stored document with missing or odd details', async () => {
    h.state.result = { data: [{ id: 'd1', layout: {}, data: { values: 'nope', medicines: 'nope', logoUrl: 5 } }], error: null }
    const { data } = await documentService.listIssued('c1')
    expect(data![0].data).toEqual({ values: {}, medicines: [], logoUrl: null })
    expect(data![0].layout.elements).toEqual([])
  })
  it('returns the database error when issuing fails', async () => {
    h.state.rpcResult = { data: null, error: { message: 'Patient not found' } }
    const out = await documentService.issue({ kind: 'medcert', patient_id: 'x', doctor_id: null, template_id: null, layout: presetLayout('medcert', 'classic'), data: { values: {}, medicines: [] } })
    expect(out).toEqual({ data: null, error: 'Patient not found' })
  })
  it('voids with a reason', async () => {
    h.state.rpcResult = { data: { id: 'd1', layout: {}, data: {} }, error: null }
    await documentService.void('d1', 'Wrong patient')
    expect(h.rpc).toHaveBeenCalledWith('void_document', { p_document_id: 'd1', p_reason: 'Wrong patient' })
  })
})

describe('listing the history', () => {
  beforeEach(() => { h.state.result = { data: [], error: null } })

  it("is limited to the clinic, the current branch, and the newest first", async () => {
    await documentService.listIssued('c1', {}, 50)
    expect(called('eq')).toContainEqual(['clinic_id', 'c1'])
    expect(called('is')).toContainEqual(['branch_id', null])
    expect(called('order')[0]).toEqual(['issued_at', { ascending: false }])
    expect(called('limit')[0]).toEqual([50])
  })
  it('applies the type, status and patient filters', async () => {
    await documentService.listIssued('c1', { kind: 'medcert', status: 'voided', patientId: 'p9' })
    const eq = called('eq')
    expect(eq).toContainEqual(['kind', 'medcert'])
    expect(eq).toContainEqual(['status', 'voided'])
    expect(eq).toContainEqual(['patient_id', 'p9'])
  })
  it('searches the patient name and number', async () => {
    await documentService.listIssued('c1', { search: '  juan  ' })
    expect(called('or')[0][0]).toBe('patient_name.ilike.%juan%,number.ilike.%juan%')
  })
  it('strips characters that could change the meaning of the search filter', async () => {
    await documentService.listIssued('c1', { search: 'a%b,c(d)e' })
    const filter = called('or')[0][0] as string
    expect(filter).toBe('patient_name.ilike.%a b c d e%,number.ilike.%a b c d e%')
    expect(filter.split(',')).toHaveLength(2) // still exactly the two conditions
  })
  it('skips the search for a blank box', async () => {
    await documentService.listIssued('c1', { search: '   ' })
    expect(called('or')).toHaveLength(0)
  })
})

describe('uploading an image', () => {
  const file = (type: string, size = 100) => {
    const f = new File(['x'], 'a', { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  it('accepts PNG, JPG and WebP and returns a public link in the clinic folder', async () => {
    for (const [type, ext] of [['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp']]) {
      const out = await documentService.uploadImage('clinic-1', file(type))
      expect(out.error).toBeNull()
      expect(out.data).toMatch(new RegExp(`^https://cdn\\.test/documents/clinic-1/[0-9a-f-]{36}\\.${ext}$`))
    }
  })
  it('refuses other file types, including SVG and HTML', async () => {
    for (const type of ['image/svg+xml', 'text/html', 'application/pdf', '']) {
      const out = await documentService.uploadImage('clinic-1', file(type))
      expect(out.data).toBeNull()
      expect(out.error).toContain('PNG, JPG or WebP')
    }
    expect(h.storage.upload).not.toHaveBeenCalled()
  })
  it('refuses a file over 1.5 MB', async () => {
    const out = await documentService.uploadImage('clinic-1', file('image/png', 2 * 1024 * 1024))
    expect(out.error).toContain('1.5 MB')
    expect(h.storage.upload).not.toHaveBeenCalled()
  })
  it('reports a storage error', async () => {
    h.storage.upload.mockResolvedValueOnce({ error: { message: 'bucket not found' } })
    const out = await documentService.uploadImage('clinic-1', file('image/png'))
    expect(out).toEqual({ data: null, error: 'bucket not found' })
  })
})
