import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { useActiveOrganization } from '../clients/clientQueries'
import {
  getFinancialClients,
  getMaintenancePayments,
  getReceivedRevenue,
  searchPayments,
} from './paymentApi'
import type { PaymentFilters } from './types'

export const paymentKeys = {
  all: ['payments'] as const,
  list: (organizationId: string, search: string, filters: PaymentFilters) => [
    ...paymentKeys.all, 'list', organizationId, search,
    filters.periodStart, filters.periodEnd, filters.clientId, filters.method, filters.status,
  ] as const,
  revenue: (organizationId: string, start: string, end: string) => [
    ...paymentKeys.all, 'revenue', organizationId, start, end,
  ] as const,
  clients: (organizationId: string) => [...paymentKeys.all, 'clients', organizationId] as const,
  maintenance: (organizationId: string, maintenanceId: string) => [
    ...paymentKeys.all, 'maintenance', organizationId, maintenanceId,
  ] as const,
}

export function usePayments(search: string, filters: PaymentFilters) {
  const organization = useActiveOrganization()
  const deferredSearch = useDeferredValue(search.trim())
  const enabled = Boolean(organization.data)
  const payments = useQuery({
    queryKey: paymentKeys.list(organization.data ?? '', deferredSearch, filters),
    queryFn: () => searchPayments(organization.data!, deferredSearch, filters),
    enabled,
  })
  const revenue = useQuery({
    queryKey: paymentKeys.revenue(organization.data ?? '', filters.periodStart, filters.periodEnd),
    queryFn: () => getReceivedRevenue(organization.data!, filters.periodStart, filters.periodEnd),
    enabled,
  })
  const clients = useQuery({
    queryKey: paymentKeys.clients(organization.data ?? ''),
    queryFn: () => getFinancialClients(organization.data!),
    enabled,
    staleTime: 60_000,
  })
  return { organization, payments, revenue, clients, deferredSearch }
}

export function useMaintenancePayments(organizationId: string, maintenanceId: string) {
  return useQuery({
    queryKey: paymentKeys.maintenance(organizationId, maintenanceId),
    queryFn: () => getMaintenancePayments(organizationId, maintenanceId),
    enabled: Boolean(organizationId && maintenanceId),
  })
}
