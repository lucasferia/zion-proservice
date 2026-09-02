import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useAuth } from '../auth/auth-context'
import { getActiveOrganizationId, getClientDetails, searchClients } from './clientApi'

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (organizationId: string, search: string) =>
    [...clientKeys.lists(), organizationId, search] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (organizationId: string, clientId: string) =>
    [...clientKeys.details(), organizationId, clientId] as const,
}

export function useActiveOrganization() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['active-organization', session?.user.id],
    queryFn: () => getActiveOrganizationId(session!.user.id),
    enabled: Boolean(session?.user.id),
    staleTime: 5 * 60_000,
  })
}

export function useClients(search: string) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())

  const clients = useQuery({
    queryKey: clientKeys.list(organization.data ?? '', deferredSearch),
    queryFn: () => searchClients(organization.data!, deferredSearch),
    enabled: Boolean(organization.data),
  })

  return { organization, clients, deferredSearch }
}

export function useClientDetails(clientId: string | undefined) {
  const organization = useActiveOrganization()
  const client = useQuery({
    queryKey: clientKeys.detail(organization.data ?? '', clientId ?? ''),
    queryFn: () => getClientDetails(organization.data!, clientId!),
    enabled: Boolean(organization.data && clientId),
  })

  return { organization, client }
}

