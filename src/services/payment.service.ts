import { supabase } from './supabase'
import type { Payment, ApiResponse } from '@/types'

export type PaymentWithDetails = Payment & {
  patients: { full_name: string; contact_number: string } | null
}

export const paymentService = {
  async create(data: {
    clinic_id: string
    patient_id: string
    appointment_id?: string
    branch_id?: string
    amount: number
    payment_method: Payment['payment_method']
  }): Promise<ApiResponse<Payment>> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({ ...data, status: 'paid', paid_at: new Date().toISOString() })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: payment, error: null }
  },

  async getByDate(clinicId: string, date: string): Promise<ApiResponse<PaymentWithDetails[]>> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, patients(full_name, contact_number)')
      .eq('clinic_id', clinicId)
      .gte('paid_at', `${date}T00:00:00`)
      .lte('paid_at', `${date}T23:59:59`)
      .order('paid_at', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: (data as any) ?? [], error: null }
  },

  async getToday(clinicId: string): Promise<ApiResponse<PaymentWithDetails[]>> {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDate(clinicId, today)
  },

  async getSummary(clinicId: string, date: string) {
    const { data } = await this.getByDate(clinicId, date)
    const payments = data ?? []

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    const byMethod = {
      cash:  payments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + Number(p.amount), 0),
      gcash: payments.filter(p => p.payment_method === 'gcash').reduce((s, p) => s + Number(p.amount), 0),
      maya:  payments.filter(p => p.payment_method === 'maya').reduce((s, p) => s + Number(p.amount), 0),
      card:  payments.filter(p => p.payment_method === 'card').reduce((s, p) => s + Number(p.amount), 0),
      other: payments.filter(p => p.payment_method === 'other').reduce((s, p) => s + Number(p.amount), 0),
    }

    return { total, byMethod, count: payments.length, payments }
  },

  async getMonthly(clinicId: string, year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_method, paid_at')
      .eq('clinic_id', clinicId)
      .eq('status', 'paid')
      .gte('paid_at', `${start}T00:00:00`)
      .lte('paid_at', `${end}T23:59:59`)
      .order('paid_at', { ascending: true })

    if (error) return { total: 0, daily: [] }

    const payments = data ?? []
    const total = payments.reduce((s, p) => s + Number(p.amount), 0)

    // Group by day
    const dailyMap: Record<string, number> = {}
    payments.forEach(p => {
      const day = p.paid_at.split('T')[0]
      dailyMap[day] = (dailyMap[day] ?? 0) + Number(p.amount)
    })

    const daily = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }))
    return { total, daily }
  },
}