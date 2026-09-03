import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import type { Supplier, SupplierInput } from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function normalizeSupplier(input: SupplierInput) {
  return {
    legal_name: input.legal_name.trim(),
    trade_name: optional(input.trade_name),
    tax_id: optional(input.tax_id),
    contact_name: optional(input.contact_name),
    phone: optional(input.phone),
    email: optional(input.email.toLowerCase()),
    address: optional(input.address),
    notes: optional(input.notes),
    status: input.status,
  }
}

export function friendlySupplierError(error: { code?: string; message?: string } | null) {
  if (error?.code === '23505') return 'Já existe um fornecedor ativo com este CPF ou CNPJ.'
  if (error?.code === '23503') return 'Este fornecedor está vinculado a outro registro e não pode ser removido.'
  return friendlyDataError(error)
}

export async function searchSuppliers(organizationId: string, search: string, status: string) {
  const { data, error } = await requireClient().rpc('search_suppliers', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    filter_status: status || null,
  })
  if (error) throw new Error(friendlySupplierError(error))
  return (data ?? []) as Supplier[]
}

export async function getSupplier(organizationId: string, supplierId: string) {
  const { data, error } = await requireClient()
    .from('suppliers')
    .select('id, organization_id, legal_name, trade_name, tax_id, contact_name, phone, email, address, notes, status, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(friendlySupplierError(error))
  return data as Supplier
}

export async function createSupplier(organizationId: string, input: SupplierInput) {
  const { data, error } = await requireClient()
    .from('suppliers')
    .insert({ organization_id: organizationId, ...normalizeSupplier(input) })
    .select('id')
    .single()
  if (error) throw new Error(friendlySupplierError(error))
  return data.id as string
}

export async function updateSupplier(organizationId: string, supplierId: string, input: SupplierInput) {
  const { error } = await requireClient()
    .from('suppliers')
    .update(normalizeSupplier(input))
    .eq('organization_id', organizationId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .select('id')
    .single()
  if (error) throw new Error(friendlySupplierError(error))
}

export async function archiveSupplier(organizationId: string, supplierId: string) {
  const { error } = await requireClient()
    .from('suppliers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .select('id')
    .single()
  if (error) throw new Error(friendlySupplierError(error))
}
