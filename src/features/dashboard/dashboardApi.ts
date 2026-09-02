import { getSupabaseClient } from '../../lib/supabase'
import type { DashboardPeriod, OperationalDashboard } from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

export function friendlyDashboardError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível carregar o dashboard operacional.'
  if (error.message?.includes('início do período')) return error.message
  if (error.code === '42501') return 'Você não tem permissão para consultar esta organização.'
  return 'Não foi possível carregar os indicadores. Tente novamente.'
}

export async function getOperationalDashboard(organizationId: string, period: DashboardPeriod) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('get_operational_dashboard', {
    target_organization_id: organizationId,
    filter_period_start: period.start,
    filter_period_end: period.end,
  })
  if (error) throw new Error(friendlyDashboardError(error))
  if (!data?.[0]) throw new Error('O dashboard não retornou os indicadores esperados.')
  return data[0] as OperationalDashboard
}
