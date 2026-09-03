import { getSupabaseClient } from '../../lib/supabase'
import type {
  ClientDetails,
  ClientInput,
  ClientLocation,
  ClientLocationInput,
  ClientSummary,
} from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function normalizeClient(input: ClientInput) {
  return {
    name: input.name.trim(),
    phone: optional(input.phone),
    email: optional(input.email.toLowerCase()),
    document: optional(input.document),
    notes: optional(input.notes),
  }
}

function normalizeLocation(input: ClientLocationInput) {
  return {
    name: input.name.trim(),
    postal_code: optional(input.postal_code),
    street: input.street.trim(),
    number: optional(input.number),
    complement: optional(input.complement),
    neighborhood: optional(input.neighborhood),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    notes: optional(input.notes),
  }
}

export function friendlyDataError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação.'
  if (error.code === '23505') return 'Já existe um registro com essas informações.'
  if (error.code === '23503') return 'O cliente ou a unidade selecionada não está mais disponível.'
  if (error.code === '23514') return 'Revise os campos informados e tente novamente.'
  if (error.code === '42501') return 'Você não tem permissão para realizar esta ação.'
  if (error.code === 'PGRST116') return 'O registro não foi encontrado ou foi arquivado.'
  return 'Não foi possível concluir a operação. Tente novamente.'
}

export async function getActiveOrganizationId(userId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(2)

  if (error) throw new Error(friendlyDataError(error))
  if (!data?.length) throw new Error('Sua conta não está vinculada a uma organização ativa.')
  if (data.length > 1) {
    throw new Error('Sua conta possui mais de uma organização. A seleção de organização ainda não está disponível.')
  }

  return data[0].organization_id as string
}

export async function searchClients(organizationId: string, search: string) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_clients', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
  })

  if (error) throw new Error(friendlyDataError(error))
  return (data ?? []) as ClientSummary[]
}

export async function getClientDetails(organizationId: string, clientId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      id,
      organization_id,
      name,
      phone,
      email,
      document,
      notes,
      created_at,
      updated_at,
      client_locations (
        id,
        organization_id,
        client_id,
        name,
        postal_code,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        notes,
        created_at,
        updated_at,
        deleted_at
      )
    `)
    .eq('organization_id', organizationId)
    .eq('id', clientId)
    .is('deleted_at', null)
    .is('client_locations.deleted_at', null)
    .single()

  if (error) throw new Error(friendlyDataError(error))

  const details = data as unknown as ClientDetails
  details.client_locations = [...(details.client_locations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  )
  return details
}

export async function createClient(organizationId: string, input: ClientInput) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({ organization_id: organizationId, ...normalizeClient(input) })
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
  return data.id as string
}

export async function updateClient(
  organizationId: string,
  clientId: string,
  input: ClientInput,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('clients')
    .update(normalizeClient(input))
    .eq('organization_id', organizationId)
    .eq('id', clientId)
    .is('deleted_at', null)
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
}

export async function deleteClient(organizationId: string, clientId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('delete_client', {
    target_organization_id: organizationId,
    target_client_id: clientId,
  })

  if (error) throw new Error(friendlyDataError(error))
}

export async function archiveClient(organizationId: string, clientId: string) {
  return deleteClient(organizationId, clientId)
}

export async function createClientLocation(
  organizationId: string,
  clientId: string,
  input: ClientLocationInput,
) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('client_locations')
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      ...normalizeLocation(input),
    })
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
  return data.id as string
}

export async function updateClientLocation(
  organizationId: string,
  locationId: string,
  input: ClientLocationInput,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('client_locations')
    .update(normalizeLocation(input))
    .eq('organization_id', organizationId)
    .eq('id', locationId)
    .is('deleted_at', null)
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
}

export async function deleteClientLocation(organizationId: string, locationId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('delete_client_location', {
    target_organization_id: organizationId,
    target_location_id: locationId,
  })

  if (error) throw new Error(friendlyDataError(error))
}

export async function archiveClientLocation(organizationId: string, locationId: string) {
  return deleteClientLocation(organizationId, locationId)
}

export function locationToInput(location: ClientLocation): ClientLocationInput {
  return {
    name: location.name,
    postal_code: location.postal_code ?? '',
    street: location.street,
    number: location.number ?? '',
    complement: location.complement ?? '',
    neighborhood: location.neighborhood ?? '',
    city: location.city,
    state: location.state,
    notes: location.notes ?? '',
  }
}
