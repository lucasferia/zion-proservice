export type AcademyUserStatus = 'pending' | 'active' | 'suspended'
export type AcademyCommercialStatus =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'

export const academyUserStatuses: { value: AcademyUserStatus; label: string }[] = [
  { value: 'pending', label: 'Aguardando liberação' },
  { value: 'active', label: 'Acesso ativo' },
  { value: 'suspended', label: 'Acesso suspenso' },
]

export const academyCommercialStatuses: { value: AcademyCommercialStatus; label: string }[] = [
  { value: 'pending', label: 'Aguardando liberação' },
  { value: 'trialing', label: 'Período de teste' },
  { value: 'active', label: 'Portal ativo' },
  { value: 'past_due', label: 'Pagamento pendente' },
  { value: 'suspended', label: 'Portal suspenso' },
  { value: 'cancelled', label: 'Acesso cancelado' },
]

export type AcademyAdminSummary = {
  pending_users: number
  active_users: number
  suspended_users: number
  active_academies: number
}
export type AcademyAdminUser = {
  user_id: string
  full_name: string | null
  email: string
  email_confirmed: boolean
  auth_disabled: boolean
  portal_status: AcademyUserStatus
  organization_id: string | null
  client_id: string | null
  client_name: string | null
  active_location_count: number
  commercial_status: AcademyCommercialStatus | null
  created_at: string
  updated_at: string
  total_count: number
}

export type AcademyAdminLocationOption = {
  client_id: string
  client_name: string
  client_location_id: string
  client_location_name: string
  city: string
}

export type AcademyAdminLocation = {
  id: string
  clientId: string
  name: string
  city: string
  status: 'active' | 'revoked'
  archived: boolean
  grantedAt: string
  grantedByName: string | null
  revokedAt: string | null
  revokedByName: string | null
  revocationReason: string | null
}

export type AcademyAuditEvent = {
  id: number
  action: string
  previousState: Record<string, unknown>
  nextState: Record<string, unknown>
  reason: string
  performedByName: string | null
  createdAt: string
  clientLocationId: string | null
}

export type AcademyAdminUserDetails = {
  userId: string
  fullName: string | null
  email: string
  emailConfirmed: boolean
  authDisabled: boolean
  status: AcademyUserStatus
  organizationId: string | null
  createdAt: string
  updatedAt: string
  statusChangedAt: string | null
  statusChangeReason: string | null
  client: { id: string; name: string; archived: boolean } | null
  commercial: {
    status: AcademyCommercialStatus
    updatedAt: string
    reason: string
    affectedUsers: number
  } | null
  locations: AcademyAdminLocation[]
  auditEvents: AcademyAuditEvent[]
}

export type AcademyUserListFilters = {
  search: string
  status: string
  clientId: string
  page: number
  pageSize?: number
}
