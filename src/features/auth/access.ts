import type { AccessContext, AccessContextKind } from './auth-context'

type AccessInput = AccessContextKind | AccessContext | null

function normalizeAccess(context: AccessInput) {
  return typeof context === 'string'
    ? { kind: context, blockingReason: null }
    : context
}

export function getDefaultAccessPath(context: AccessInput) {
  const access = normalizeAccess(context)
  if (access?.kind === 'academy_pending' && access.blockingReason === 'no_active_location') {
    return '/portal/acesso-indisponivel'
  }
  if (access?.kind === 'academy_suspended' && access.blockingReason === 'commercial_access_blocked') {
    return '/portal/acesso-indisponivel'
  }

  switch (access?.kind) {
    case 'internal_owner':
    case 'internal_technician':
      return '/app'
    case 'academy_active':
      return '/portal'
    case 'academy_pending':
      return '/portal/aguardando'
    case 'academy_suspended':
      return '/portal/suspenso'
    default:
      return '/conta-sem-acesso'
  }
}

export function isPathAllowedForContext(pathname: string, context: AccessContextKind | AccessContext) {
  const access = normalizeAccess(context)
  if (!access) return false
  if (access.kind === 'internal_owner' || access.kind === 'internal_technician') {
    return pathname === '/app' || pathname.startsWith('/app/')
  }
  if (access.kind === 'academy_active') {
    return ['/portal', '/portal/unidades', '/portal/perfil'].includes(pathname)
  }
  if (access.kind === 'academy_pending') return pathname === getDefaultAccessPath(access)
  if (access.kind === 'academy_suspended') return pathname === getDefaultAccessPath(access)
  return pathname === '/conta-sem-acesso'
}
