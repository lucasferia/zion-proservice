import { getSupabaseClient } from '../../lib/supabase'
import type {
  AcademyAdminLocationOption,
  AcademyAdminSummary,
  AcademyAdminUser,
  AcademyAdminUserDetails,
  AcademyCommercialStatus,
  AcademyUserListFilters,
} from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function friendlyAdminError(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? ''
  if (error?.code === 'PT409' || error?.code === '40001') return 'Este registro foi alterado por outro owner. Recarregue a página antes de confirmar.'
  if (error?.code === '42501') return 'Somente um owner ativo pode administrar o Portal das Academias.'
  if (error?.code === 'P0002') return 'O usuário ou a academia não está mais disponível.'
  if (error?.code === '23503') return message || 'A academia ou uma das unidades selecionadas não está disponível.'
  if (error?.code === '23505') return 'A mesma unidade foi selecionada mais de uma vez.'
  if (error?.code === '23514' || error?.code === '22023' || error?.code === '55000') {
    return message || 'Revise as informações antes de confirmar.'
  }
  return 'Não foi possível concluir a operação. Tente novamente.'
}

export async function getAcademyAdminSummary() {
  const { data, error } = await requireClient().rpc('get_academy_portal_admin_summary')
  if (error) throw new Error(friendlyAdminError(error))
  const row = (data as AcademyAdminSummary[] | null)?.[0]
  if (!row) throw new Error('Não foi possível carregar os indicadores do Portal.')
  return row
}

export async function listAcademyAdminUsers(filters: AcademyUserListFilters) {
  const pageSize = filters.pageSize ?? 25
  const { data, error } = await requireClient().rpc('list_academy_portal_admin_users', {
    search_term: filters.search.trim() || null,
    filter_status: filters.status || null,
    filter_client_id: filters.clientId || null,
    page_size: pageSize,
    page_offset: filters.page * pageSize,
  })
  if (error) throw new Error(friendlyAdminError(error))
  return (data ?? []) as AcademyAdminUser[]
}

export async function listAcademyAdminLocations() {
  const { data, error } = await requireClient().rpc('list_academy_portal_admin_locations')
  if (error) throw new Error(friendlyAdminError(error))
  return (data ?? []) as AcademyAdminLocationOption[]
}

export async function getAcademyAdminUser(userId: string) {
  const { data, error } = await requireClient().rpc('get_academy_portal_admin_user', {
    target_user_id: userId,
  })
  if (error) throw new Error(friendlyAdminError(error))
  return data as AcademyAdminUserDetails
}

export async function configureAcademyPortalUser(input: {
  userId: string
  clientId: string
  locationIds: string[]
  commercialStatus: 'pending' | 'trialing' | 'active'
  reason: string
  expectedUpdatedAt: string
}) {
  const { error } = await requireClient().rpc('configure_academy_portal_user', {
    target_user_id: input.userId,
    target_client_id: input.clientId,
    target_location_ids: input.locationIds,
    target_commercial_status: input.commercialStatus,
    change_reason: input.reason.trim(),
    target_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) throw new Error(friendlyAdminError(error))
}

export async function changeAcademyPortalUserStatus(input: {
  userId: string
  status: 'active' | 'suspended'
  reason: string
  expectedUpdatedAt: string
}) {
  const { error } = await requireClient().rpc('change_academy_portal_user_status', {
    target_user_id: input.userId,
    target_status: input.status,
    change_reason: input.reason.trim(),
    target_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) throw new Error(friendlyAdminError(error))
}

export async function replaceAcademyPortalUserLocations(input: {
  userId: string
  clientId: string
  locationIds: string[]
  reason: string
  expectedUpdatedAt: string
}) {
  const { error } = await requireClient().rpc('replace_academy_portal_user_locations', {
    target_user_id: input.userId,
    target_client_id: input.clientId,
    target_location_ids: input.locationIds,
    change_reason: input.reason.trim(),
    target_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) throw new Error(friendlyAdminError(error))
}

export async function changeAcademyPortalCommercialAccess(input: {
  clientId: string
  status: AcademyCommercialStatus
  reason: string
  expectedUpdatedAt: string
}) {
  const { data, error } = await requireClient().rpc('change_academy_portal_commercial_access', {
    target_client_id: input.clientId,
    target_status: input.status,
    change_reason: input.reason.trim(),
    target_expected_updated_at: input.expectedUpdatedAt,
  })
  if (error) throw new Error(friendlyAdminError(error))
  return data as number
}
