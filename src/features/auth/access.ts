import type { AccessContextKind } from './auth-context'

export function getDefaultAccessPath(context: AccessContextKind | null) {
  switch (context) {
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

export function isPathAllowedForContext(pathname: string, context: AccessContextKind) {
  if (context === 'internal_owner' || context === 'internal_technician') {
    return pathname === '/app' || pathname.startsWith('/app/')
  }
  if (context === 'academy_active') {
    return pathname === '/portal' || pathname.startsWith('/portal/')
  }
  if (context === 'academy_pending') return pathname === '/portal/aguardando'
  if (context === 'academy_suspended') return pathname === '/portal/suspenso'
  return pathname === '/conta-sem-acesso'
}
