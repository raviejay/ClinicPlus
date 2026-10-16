import { supabase } from './supabase'
import type { ApiResponse } from '@/types'
import { useBranchFilter } from '@/composables/useBranchFilter'
import { sanitizeLayout } from '@/utils/documents/sanitize'
import type { DocData, DocKind, DocLayout } from '@/utils/documents/types'

export interface DocumentTemplate {
  id: string
  clinic_id: string
  kind: DocKind
  name: string
  layout: DocLayout
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface IssuedDocument {
  id: string
  clinic_id: string
  branch_id: string | null
  patient_id: string
  kind: DocKind
  number: string
  template_id: string | null
  layout: DocLayout
  data: DocData
  patient_name: string
  doctor_id: string | null
  issued_by: string | null
  issued_at: string
  status: 'issued' | 'voided'
  void_reason: string | null
  voided_at: string | null
  voided_by: string | null
  issuer: { full_name: string | null } | null
}

const ISSUED_SELECT = '*, issuer:profiles!issued_documents_issued_by_fkey(full_name)'

// Layouts come from the database as JSON that admins can edit through the API, so they are
// rebuilt through the sanitizer on the way in.
const toTemplate = (row: any): DocumentTemplate => ({ ...row, layout: sanitizeLayout(row.layout) })
const toIssued = (row: any): IssuedDocument => ({
  ...row,
  layout: sanitizeLayout(row.layout),
  data: {
    values: row.data?.values && typeof row.data.values === 'object' ? row.data.values : {},
    medicines: Array.isArray(row.data?.medicines) ? row.data.medicines : [],
    logoUrl: typeof row.data?.logoUrl === 'string' ? row.data.logoUrl : null,
  },
})

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024

export const documentService = {
  async listTemplates(clinicId: string, kind?: DocKind): Promise<ApiResponse<DocumentTemplate[]>> {
    let query = supabase.from('document_templates').select('*').eq('clinic_id', clinicId)
    if (kind) query = query.eq('kind', kind)
    const { data, error } = await query.order('is_default', { ascending: false }).order('name')
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []).map(toTemplate), error: null }
  },

  async getTemplate(id: string): Promise<ApiResponse<DocumentTemplate>> {
    const { data, error } = await supabase.from('document_templates').select('*').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    return { data: toTemplate(data), error: null }
  },

  async createTemplate(input: {
    clinic_id: string
    kind: DocKind
    name: string
    layout: DocLayout
    is_default?: boolean
  }): Promise<ApiResponse<DocumentTemplate>> {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({ ...input, name: input.name.trim() })
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: toTemplate(data), error: null }
  },

  async updateTemplate(
    id: string,
    patch: { name?: string; layout?: DocLayout; is_default?: boolean },
  ): Promise<ApiResponse<DocumentTemplate>> {
    const { data, error } = await supabase
      .from('document_templates')
      .update({ ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) })
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: toTemplate(data), error: null }
  },

  async deleteTemplate(id: string): Promise<ApiResponse<null>> {
    const { error } = await supabase.from('document_templates').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },

  // Saves the document with the next number and the exact layout used, so it can be reprinted as issued.
  async issue(input: {
    kind: DocKind
    patient_id: string
    doctor_id: string | null
    template_id: string | null
    layout: DocLayout
    data: DocData
  }): Promise<ApiResponse<IssuedDocument>> {
    const { data, error } = await supabase.rpc('issue_document', {
      p_kind: input.kind,
      p_patient_id: input.patient_id,
      p_doctor_id: input.doctor_id,
      p_template_id: input.template_id,
      p_layout: input.layout,
      p_data: input.data,
    })
    if (error) return { data: null, error: error.message }
    return { data: toIssued({ ...(data as any), issuer: null }), error: null }
  },

  async listIssued(
    clinicId: string,
    filters: { kind?: DocKind; status?: 'issued' | 'voided'; patientId?: string; search?: string } = {},
    limit = 200,
  ): Promise<ApiResponse<IssuedDocument[]>> {
    const { buildBranchFilter } = useBranchFilter()
    let query = supabase.from('issued_documents').select(ISSUED_SELECT).eq('clinic_id', clinicId)
    query = buildBranchFilter(query)
    if (filters.kind) query = query.eq('kind', filters.kind)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.patientId) query = query.eq('patient_id', filters.patientId)
    if (filters.search?.trim()) {
      const q = filters.search.trim().replace(/[%,()]/g, ' ')
      query = query.or(`patient_name.ilike.%${q}%,number.ilike.%${q}%`)
    }
    const { data, error } = await query.order('issued_at', { ascending: false }).limit(limit)
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []).map(toIssued), error: null }
  },

  async void(id: string, reason: string): Promise<ApiResponse<IssuedDocument>> {
    const { data, error } = await supabase.rpc('void_document', { p_document_id: id, p_reason: reason })
    if (error) return { data: null, error: error.message }
    return { data: toIssued({ ...(data as any), issuer: null }), error: null }
  },

  // Logos and signatures used in templates. Stored with the clinic's other assets.
  async uploadImage(clinicId: string, file: File): Promise<ApiResponse<string>> {
    if (!IMAGE_TYPES.includes(file.type)) return { data: null, error: 'Please choose a PNG, JPG or WebP image.' }
    if (file.size > MAX_IMAGE_BYTES) return { data: null, error: 'The image must be under 1.5 MB.' }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `documents/${clinicId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('clinic-assets').upload(path, file, { contentType: file.type })
    if (error) return { data: null, error: error.message }
    return { data: supabase.storage.from('clinic-assets').getPublicUrl(path).data.publicUrl, error: null }
  },
}
