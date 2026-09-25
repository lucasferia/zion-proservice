import { getSupabaseClient } from '../../lib/supabase'
import type { PortalContextData } from './types'

export class PortalAuthorizationError extends Error {
  constructor() {
    super('Seu acesso mudou e precisa ser validado novamente.')
    this.name = 'PortalAuthorizationError'
  }
}

function isPortalContext(value: unknown): value is PortalContextData {
  if (!value || typeof value !== 'object') return false
  const context = value as Partial<PortalContextData>
  return Boolean(
    context.user?.fullName
    && context.organization?.name
    && context.academy?.name
    && (context.access?.commercialStatus === 'trialing' || context.access?.commercialStatus === 'active')
    && Array.isArray(context.units)
    && context.units.length > 0
    && context.units.every((unit) => unit.id && unit.name && unit.city && unit.state),
  )
}

export async function getPortalContext() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')

  const { data, error } = await client.rpc('portal_get_context')
  if (error?.code === '42501') throw new PortalAuthorizationError()
  if (error) throw new Error('Não foi possível atualizar o contexto do Portal.')
  if (!isPortalContext(data)) throw new PortalAuthorizationError()
  return data
}
