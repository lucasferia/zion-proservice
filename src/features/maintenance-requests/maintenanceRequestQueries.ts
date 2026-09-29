import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useActiveOrganization } from '../clients/clientQueries'
import { usePortalContext } from '../portal/portal-context'
import { getInternalMaintenanceRequest, getPortalMaintenanceRequest, getPortalRequestPhotos, listInternalMaintenanceRequests, listPortalMaintenanceRequests } from './maintenanceRequestApi'
import type { RequestFilters } from './types'

export const requestKeys = { all: ['maintenance-requests'] as const, portal: () => ['maintenance-requests', 'portal'] as const, internal: () => ['maintenance-requests', 'internal'] as const }

export function usePortalRequestList(userId: string, search: string, filters: RequestFilters, page: number) {
  const { selectedUnit } = usePortalContext()
  const deferred = useDeferredValue(search.trim())
  const query = useQuery({ queryKey: [...requestKeys.portal(), 'list', userId, selectedUnit?.id, deferred, filters, page], queryFn: () => listPortalMaintenanceRequests(selectedUnit!.id, deferred, filters, page), enabled: Boolean(userId && selectedUnit), refetchOnWindowFocus: 'always' })
  return { query, deferred }
}

export function usePortalRequestDetails(userId: string, requestId?: string) {
  const { selectedUnit } = usePortalContext()
  return useQuery({ queryKey: [...requestKeys.portal(), 'detail', userId, selectedUnit?.id, requestId], queryFn: async () => ({ request: await getPortalMaintenanceRequest(selectedUnit!.id, requestId!), photos: await getPortalRequestPhotos(selectedUnit!.id, requestId!) }), enabled: Boolean(userId && selectedUnit && requestId), refetchOnWindowFocus: 'always' })
}

export function useInternalRequestList(search: string, filters: RequestFilters, page: number) {
  const organization = useActiveOrganization(); const deferred = useDeferredValue(search.trim())
  const query = useQuery({ queryKey: [...requestKeys.internal(), 'list', organization.data, deferred, filters, page], queryFn: () => listInternalMaintenanceRequests(organization.data!, deferred, filters, page), enabled: Boolean(organization.data) })
  return { organization, query, deferred }
}

export function useInternalRequestDetails(requestId?: string) {
  const organization = useActiveOrganization()
  const query = useQuery({ queryKey: [...requestKeys.internal(), 'detail', organization.data, requestId], queryFn: () => getInternalMaintenanceRequest(organization.data!, requestId!), enabled: Boolean(organization.data && requestId) })
  return { organization, query }
}
