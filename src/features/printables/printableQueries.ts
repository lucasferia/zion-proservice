import { useQuery } from '@tanstack/react-query'
import { useActiveOrganization } from '../clients/clientQueries'
import { getClientPrintRecord, getMaintenancePrintRecord } from './printableApi'

export const printableKeys = {
  all: ['printables'] as const,
  client: (organizationId: string, clientId: string) => [...printableKeys.all, 'client', organizationId, clientId] as const,
  maintenance: (organizationId: string, maintenanceId: string) => [...printableKeys.all, 'maintenance', organizationId, maintenanceId] as const,
}

export function useClientPrintRecord(clientId: string | undefined) {
  const organization = useActiveOrganization()
  const record = useQuery({
    queryKey: printableKeys.client(organization.data ?? '', clientId ?? ''),
    queryFn: () => getClientPrintRecord(organization.data!, clientId!),
    enabled: Boolean(organization.data && clientId),
  })
  return { organization, record }
}

export function useMaintenancePrintRecord(maintenanceId: string | undefined) {
  const organization = useActiveOrganization()
  const record = useQuery({
    queryKey: printableKeys.maintenance(organization.data ?? '', maintenanceId ?? ''),
    queryFn: () => getMaintenancePrintRecord(organization.data!, maintenanceId!),
    enabled: Boolean(organization.data && maintenanceId),
    staleTime: 4 * 60 * 1000,
  })
  return { organization, record }
}
